import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/lib/db-pool';
import { telegramService } from '@/lib/notifications/telegram';
import { notifyAdminNewLead } from '@/lib/notifications/telegram-channel';
import { requireAdmin } from '@/lib/auth/middleware';
import { notifyOperatorNewLead } from '@/lib/notifications/lead-notify';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

const leadLimiter = createRateLimiter({ windowMs: 60_000, max: 5 }); // 5 заявок/мин с одного IP

const LeadSchema = z.object({
  name:        z.string().min(2, 'Укажите имя').max(120),
  phone:       z.string().min(7, 'Укажите телефон').max(30),
  comment:     z.string().max(1000).optional(),
  route_id:    z.string().uuid().optional(),
  route_title: z.string().max(255).optional(),
  source_url:  z.string().max(500).optional(),
  source_data: z.record(z.unknown()).optional(),
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
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = new URL(req.url);
  const parse = ListSchema.safeParse(Object.fromEntries(searchParams));
  if (!parse.success) return NextResponse.json({ error: 'Неверные параметры' }, { status: 400 });

  const { status, limit, offset } = parse.data;

  const where = status !== 'all' ? `WHERE status = $1` : '';
  const vals  = status !== 'all' ? [status, limit, offset] : [limit, offset];
  const lIdx  = status !== 'all' ? 2 : 1;
  const oIdx  = lIdx + 1;

  const [rows, cnt] = await Promise.all([
    pool.query(
      `SELECT id, name, phone, email, comment, route_title, source_url, source_data,
              group_size, budget_rub, desired_dates,
              status, notes,
              ai_score, ai_summary, matched_tour_ids, proposal_id, processed_at,
              operator_id, created_at, updated_at
       FROM leads ${where} ORDER BY created_at DESC LIMIT $${lIdx} OFFSET $${oIdx}`,
      vals
    ),
    pool.query(
      `SELECT COUNT(*)::int AS total FROM leads ${where}`,
      status !== 'all' ? [status] : []
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

  const { name, phone, comment, route_id, route_title, source_url, source_data } = parse.data;

  let leadId: string;
  try {
    const res = await pool.query<{ id: string }>(
      `INSERT INTO leads (name, phone, comment, route_id, route_title, source_url, source_data)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [name, phone, comment ?? null, route_id ?? null, route_title ?? null, source_url ?? null, source_data ? JSON.stringify(source_data) : null]
    );
    leadId = res.rows[0].id;
  } catch {
    return NextResponse.json({ success: false, error: 'Ошибка сервера. Попробуйте позже.' }, { status: 500 });
  }

  // Telegram — LEADS_CHAT_ID (старый канал)
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
      .catch((e: unknown) => console.error('[leads] LEADS_CHAT_ID notify failed:', e));
  }

  // Admin-чат с кнопками статусов
  notifyAdminNewLead({
    id:         leadId,
    name,
    phone,
    comment:    comment ?? null,
    routeTitle: route_title ?? null,
    sourceUrl:  source_url ?? null,
    sourceData: source_data ?? null,
  }).catch((e: unknown) => console.error('[leads] notifyAdminNewLead failed:', e));

  // Уведомление оператора с ссылкой на AI-обработку
  notifyOperatorNewLead({
    leadId,
    name,
    phone,
    comment:    comment,
    routeTitle: route_title,
  }).catch(() => undefined);

  return NextResponse.json({ success: true, id: leadId }, { status: 201 });
}

function escHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
