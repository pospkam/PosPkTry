import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/lib/db-pool';
import { telegramService } from '@/lib/notifications/telegram';
import { requireRole } from '@/lib/auth/middleware';
import type { JWTPayload } from '@/lib/auth/jwt';
import { notifyOperatorNewLead } from '@/lib/notifications/lead-notify';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { leadProcessor } from '@/lib/services/lead-processor.service';
import { createLead } from '@/lib/leads/create';

const leadLimiter = createRateLimiter({ windowMs: 60_000, max: 5 }); // 5 заявок/мин с одного IP

const LeadSchema = z.object({
  name:         z.string().min(2, 'Укажите имя').max(120),
  phone:        z.string().min(7, 'Укажите телефон').max(30),
  comment:      z.string().max(1000).optional(),
  route_id:     z.string().uuid().optional(),
  route_title:  z.string().max(255).optional(),
  source_url:   z.string().max(500).optional(),
  source_data:  z.record(z.unknown()).optional(),
  partner_slug: z.string().max(100).optional(), // widget embed: resolve to operator_id
});

const ListSchema = z.object({
  status: z.enum([
    'new', 'ai_processing', 'ai_qualified', 'proposal_sent',
    'awaiting_confirm', 'contacted', 'qualified', 'converted', 'lost', 'all',
  ]).optional().default('all'),
  limit:  z.coerce.number().min(1).max(100).optional().default(50),
  offset: z.coerce.number().min(0).optional().default(0),
});

export async function GET(req: NextRequest) {
  const authResult = await requireRole(req, ['admin', 'operator']);
  if (authResult instanceof NextResponse) return authResult;

  const user = authResult as JWTPayload;
  const isAdmin = user.role === 'admin';

  const { searchParams } = new URL(req.url);
  const parse = ListSchema.safeParse(Object.fromEntries(searchParams));
  if (!parse.success) return NextResponse.json({ error: 'Неверные параметры' }, { status: 400 });

  const { status, limit, offset } = parse.data;

  // Операторы видят только свои лиды (по operator_id или unassigned)
  let operatorId: string | null = null;
  if (!isAdmin) {
    const opRes = await pool.query<{ id: string }>(
      `SELECT id FROM partners WHERE user_id = $1 LIMIT 1`,
      [user.userId]
    );
    operatorId = opRes.rows[0]?.id ?? null;
  }

  const conditions: string[] = [];
  const vals: unknown[] = [];

  if (status !== 'all') {
    vals.push(status);
    conditions.push(`status = $${vals.length}`);
  }
  if (!isAdmin && operatorId) {
    vals.push(operatorId);
    conditions.push(`(operator_id = $${vals.length} OR operator_id IS NULL)`);
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const lIdx = vals.length + 1;
  const oIdx = lIdx + 1;
  vals.push(limit, offset);

  const [rows, cnt] = await Promise.all([
    pool.query(
      `SELECT id, name, phone, email, comment, route_id, route_title, source_url, source_data,
              group_size, budget_rub, desired_dates,
              status, notes,
              ai_score, ai_summary, ai_intent, matched_tour_ids, proposal_id, processed_at,
              operator_id, created_at, updated_at
       FROM leads ${where} ORDER BY created_at DESC LIMIT $${lIdx} OFFSET $${oIdx}`,
      vals
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total FROM leads ${where}`,
      vals.slice(0, -2)
    ),
  ]);

  return NextResponse.json({ leads: rows.rows, total: cnt.rows[0].total });
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const allowed = leadLimiter.check(ip);
  if (!allowed) {
    return NextResponse.json(
      { success: false, error: 'Слишком много запросов. Попробуйте через минуту.' },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Неверный формат запроса' }, { status: 400 });
  }

  const parse = LeadSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      { success: false, error: parse.error.issues[0]?.message ?? 'Ошибка валидации' },
      { status: 422 }
    );
  }

  const { name, phone, comment, route_id, route_title, source_url, source_data, partner_slug } = parse.data;

  // Если пришёл partner_slug — резолвим operator_id
  let operatorId: string | null = null;
  if (partner_slug) {
    const pRes = await pool.query<{ id: string }>(
      `SELECT id FROM partners WHERE slug = $1 AND widget_enabled = true LIMIT 1`,
      [partner_slug]
    );
    operatorId = pRes.rows[0]?.id ?? null;
  }

  // Единый путь: скоринг → INSERT → уведомление админу
  const leadId = await createLead({
    name, phone, comment, route_id, route_title, source_url, source_data, operator_id: operatorId,
  });

  if (!leadId) {
    return NextResponse.json({ success: false, error: 'Ошибка сервера. Попробуйте позже.' }, { status: 500 });
  }

  // Telegram — LEADS_CHAT_ID (старый канал, параллельно с admin-чатом)
  const chatId = process.env.TELEGRAM_LEADS_CHAT_ID;
  if (chatId) {
    const lines = [
      '<b>Новая заявка с сайта</b>',
      '',
      `<b>Имя:</b> ${escHtml(name)}`,
      `<b>Телефон:</b> <a href="tel:${escHtml(phone)}">${escHtml(phone)}</a>`,
    ];
    if (comment) lines.push(`<b>Комментарий:</b> ${escHtml(comment)}`);
    if (route_title) lines.push(`<b>Маршрут:</b> ${escHtml(route_title)}`);
    if (source_url) lines.push(`<b>Страница:</b> <a href="${escHtml(source_url)}">${escHtml(source_url)}</a>`);
    if (source_data) {
      const sd = source_data as Record<string, string | undefined>;
      if (sd.utm_source) lines.push(`<b>UTM:</b> ${escHtml(sd.utm_source)}${sd.utm_medium ? ` / ${escHtml(sd.utm_medium)}` : ''}${sd.utm_campaign ? ` / ${escHtml(sd.utm_campaign)}` : ''}`);
      if (sd.referrer) lines.push(`<b>Referrer:</b> ${escHtml(sd.referrer)}`);
    }
    lines.push('', `<code>${leadId}</code>`);

    telegramService.sendMessage({ chatId, text: lines.join('\n'), parseMode: 'HTML' })
      .catch(() => null);
  }

  // Уведомление оператора с ссылкой на AI-обработку
  notifyOperatorNewLead({
    leadId,
    name,
    phone,
    comment:    comment,
    routeTitle: route_title,
  }).catch(() => undefined);

  // AI обработка — fire-and-forget, не блокирует ответ туристу
  void autoProcessLead(leadId, name);

  return NextResponse.json({ success: true, id: leadId }, { status: 201 });
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Авто-обработка лида: AI квалифицирует + подбирает туры + уведомляет ──────
async function autoProcessLead(leadId: string, leadName: string): Promise<void> {
  try {
    const proposal = await leadProcessor.process(leadId);

    // Уведомить admin в TG с AI-результатом
    const token = process.env.TELEGRAM_BOT_TOKEN;
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!token || !chatId) return;

    const scoreBar = '█'.repeat(Math.round(proposal.ai_score / 10)) + '░'.repeat(10 - Math.round(proposal.ai_score / 10));
    const urgencyLabel: Record<string, string> = { high: 'СРОЧНО', medium: 'Стандарт', low: 'Низкий приоритет' };

    const lines = [
      `AI обработал лид: <b>${escHtml(leadName)}</b>`,
      ``,
      `<b>${escHtml(proposal.headline)}</b>`,
      ``,
      `Скор: <code>${scoreBar}</code> ${proposal.ai_score}/100`,
      `Приоритет: ${urgencyLabel[proposal.intent.urgency] ?? proposal.intent.urgency}`,
      proposal.intent.activity_types.length > 0
        ? `Активности: ${proposal.intent.activity_types.join(', ')}`
        : '',
      proposal.intent.group_size > 1 ? `Группа: ${proposal.intent.group_size} чел.` : '',
      proposal.intent.budget_rub ? `Бюджет: ${proposal.intent.budget_rub.toLocaleString('ru-RU')} руб` : '',
      proposal.intent.desired_dates ? `Даты: ${proposal.intent.desired_dates}` : '',
      ``,
      proposal.primary_tour
        ? `Рекомендован тур: <b>${escHtml(proposal.primary_tour.title)}</b> — ${proposal.primary_tour.price.toLocaleString('ru-RU')} руб/чел`
        : 'Подходящих туров не найдено',
      ``,
      `<i>${escHtml(proposal.intent.qualification_notes)}</i>`,
      ``,
      `<a href="https://tourhab.ru/hub/admin/leads">Открыть лиды →</a>  <code>${leadId}</code>`,
    ].filter(Boolean);

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: lines.join('\n'),
        parse_mode: 'HTML',
        disable_web_page_preview: true,
        reply_markup: {
          inline_keyboard: [[
            { text: 'Связался', callback_data: `lead_contacted:${leadId}` },
            { text: 'Квалифицирован', callback_data: `lead_qualified:${leadId}` },
            { text: 'Конвертирован', callback_data: `lead_converted:${leadId}` },
          ]],
        },
      }),
    }).catch(() => {});

    // Планируем follow-up напоминания (fire-and-forget)
    void scheduleFollowups(leadId, leadName, proposal.ai_score);

  } catch {
    // Тихая ошибка — не влияет на туриста
  }
}

// ── Follow-up расписание: Day+1, Day+2, Day+5 ────────────────────────────────
async function scheduleFollowups(
  leadId: string,
  leadName: string,
  aiScore: number,
): Promise<void> {
  const urgencyDays = aiScore >= 70 ? [1, 2, 4] : [1, 3, 7]; // горячие лиды — чаще
  const types = ['day1', 'day2', 'day5'] as const;

  const messages = [
    `Первый follow-up: ${leadName} оставил заявку вчера. Скор ${aiScore}/100. Позвоните сегодня.`,
    `Второй follow-up: ${leadName} ждёт уже ${urgencyDays[1]} дня. Не упустите клиента.`,
    `Последний шанс: ${leadName} — заявка без ответа ${urgencyDays[2]} дней. Закройте или отметьте как отказ.`,
  ];

  const now = new Date();
  for (let i = 0; i < 3; i++) {
    const scheduledAt = new Date(now.getTime() + urgencyDays[i] * 24 * 60 * 60 * 1000);
    await pool.query(
      `INSERT INTO lead_followups (lead_id, followup_type, scheduled_at, message_text)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT DO NOTHING`,
      [leadId, types[i], scheduledAt.toISOString(), messages[i]]
    ).catch(() => {});
  }
}
