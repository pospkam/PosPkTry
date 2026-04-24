/**
 * POST /api/telegram/webhook
 *
 * Обработчик @KuzmichKam_bot.
 *
 * Команды (публичные):
 *   /start     — приветствие
 *   /help      — список команд
 *   /route     — случайный маршрут из каталога
 *   /sezon     — AI-совет на текущий сезон
 *   /weather   — погода в Петропавловске-Камчатском
 *   /tip       — случайный совет путешественнику
 *   /operators — список партнёров
 *   <текст>    — AI-диалог с историей
 *
 * Admin (только TELEGRAM_CHAT_ID):
 *   /stats              — статистика платформы
 *   /leads              — последние 5 заявок
 *   /digest             — AI дайджест платформы (лиды, брони, рекомендации)
 *   /agent <text>       — прямой запрос к PlatformAgent (любой intent)
 *   /approve_<id>       — одобрить ожидающее действие агента
 *   /reject_<id>        — отклонить ожидающее действие агента
 *   /post operator slug — публикация оператора в канал
 *   /post route uuid    — публикация маршрута в канал
 *   /post sezon         — AI генерирует сезонный пост в канал
 *
 * Безопасность: X-Telegram-Bot-Api-Secret-Token
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/lib/db-pool';
import { telegramService } from '@/lib/notifications/telegram';
import { confirmBooking, cancelBooking } from '@/lib/bookings/booking.service';
import { query } from '@/lib/database';
import { callAIWithModelDirect } from '@/lib/ai/providers';
import { getModelForAgent } from '@/lib/ai/agent-models';
import { KUZMICH_PROMPT, type ChatMessage } from '@/lib/ai/prompts';
import { parseInterestsFromText, findRoutesByInterests, formatRoutesForTelegram } from '@/lib/services/routes-recommender';
import {
  postRouteToChannel,
  postOperatorToChannel,
  postSezonToChannel,
  postFriendToChannel,
} from '@/lib/notifications/telegram-channel';
import { PlatformAgent } from '@/lib/agents/platform-agent';
import { classifyIntentByKeywords } from '@/lib/agents/intent-classifier';
import { approvalRequired } from '@/lib/agents/safeguards/approval-required';
import { verifyConnectToken } from '@/lib/telegram/connect-token';
import { sendWelcomeMessage } from '@/lib/telegram/welcome';
import { notifyTouristBookingConfirmed, notifyTouristBookingCancelled } from '@/lib/telegram/booking-notify';
import { createTicket, getUserOpenTickets, addTicketMessage } from '@/lib/support/ticket.service';
import { categorizeSupport, CATEGORY_LABELS, RESIDENT_INTRO } from '@/lib/support/categorize';
import { leadProcessor } from '@/lib/services/lead-processor.service';
import { groupMonitor } from '@/lib/telegram/group-monitor';
import { createLead } from '@/lib/leads/create';

export const dynamic = 'force-dynamic';

// Пользователи в процессе оформления заявки через /start lead
const pendingLeadFlow = new Map<string, { firstName: string; startedAt: number }>();
setInterval(() => {
  const cutoff = Date.now() - 30 * 60 * 1000;
  for (const [k, v] of pendingLeadFlow) {
    if (v.startedAt < cutoff) pendingLeadFlow.delete(k);
  }
}, 5 * 60 * 1000);

const KUZMICH_CHAT_SYSTEM =
  KUZMICH_PROMPT +
  '\n\nРЕЖИМ: Telegram-чат, не публикация. Ответ 70-120 слов.' +
  ' HTML-теги для Telegram: <b>жирный</b>, <i>курсив</i>. Без markdown-звёздочек.';

// ── Zod-схемы ─────────────────────────────────────────────────────────────────

const TelegramUserSchema = z.object({
  id: z.number(),
  username: z.string().optional(),
  first_name: z.string().optional(),
});

const TelegramChatSchema = z.object({
  id: z.number(),
  type: z.string().optional(),
});

const TelegramUpdateSchema = z.object({
  update_id: z.number(),
  message: z.object({
    message_id: z.number().optional(),
    from: TelegramUserSchema.optional(),
    chat: TelegramChatSchema.optional(),
    text: z.string().optional(),
  }).optional(),
  callback_query: z.object({
    id: z.string(),
    from: TelegramUserSchema,
    message: z.object({ chat: TelegramChatSchema.optional() }).optional(),
    data: z.string().optional(),
  }).optional(),
});

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: { id: number; username?: string; first_name?: string };
    chat: { id: number; type: string };
    text?: string;
  };
  callback_query?: {
    id: string;
    from: { id: number; username?: string };
    message?: { chat: { id: number } };
    data?: string;
  };
}

interface RouteRow { id: string; title: string; category: string; description: string | null }
interface OperatorRow { name: string; slug: string }
interface LeadRow { id: string; name: string; phone: string; route_title: string | null; created_at: string; status: string }
interface StatsRow {
  bookings_today: string; bookings_30d: string;
  leads_today: string;    leads_30d: string;
  total_users: string;    active_tours: string;
  views_today: string;    views_30d: string;
}
interface TopPageRow { path: string; cnt: string; }
interface HistoryMessage { role: 'user' | 'assistant'; content: string }

// ── Утилиты ───────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function isAuthorizedOperator(chatId: number): Promise<boolean> {
  // Проверяем по БД (partners.telegram_chat_id — заполняется при Telegram-авторизации)
  try {
    const res = await query(
      `SELECT 1 FROM partners WHERE telegram_chat_id = $1 LIMIT 1`,
      [chatId],
    );
    if (res.rows.length > 0) return true;
  } catch {}
  // Fallback: legacy env var TELEGRAM_FISHING_CHAT_ID
  const ids = (process.env.TELEGRAM_FISHING_CHAT_ID ?? '').split(',').map(s => s.trim()).filter(Boolean);
  return ids.includes(String(chatId));
}

function isAdmin(userId: number): boolean {
  const adminId = process.env.TELEGRAM_CHAT_ID;
  return !!adminId && adminId === String(userId);
}

async function sendHTML(chatId: string, text: string): Promise<void> {
  await telegramService.sendMessage({ chatId, text, parseMode: 'HTML' });
}

// ── Поиск пользователя по Telegram ID ────────────────────────────────────────

interface LinkedUser {
  id: string;
  name: string;
  role: string;
  email: string;
}

async function getUserByTelegramId(telegramId: number): Promise<LinkedUser | null> {
  try {
    const res = await query<LinkedUser>(
      `SELECT id, name, role, email FROM users WHERE telegram_id = $1 LIMIT 1`,
      [telegramId]
    );
    return res.rows[0] ?? null;
  } catch { return null; }
}

// ── Определение обращений в поддержку ─────────────────────────────────────────

const SUPPORT_TRIGGERS = [
  'помогите', 'помощь', 'поддержка', 'жалоба', 'обращение',
  'проблема', 'не работает', 'ошибка', 'баг', 'сломалось',
  'оператор не отвечает', 'деньги не пришли', 'возврат', 'верните',
  'не подтвердил', 'обманул', 'неправильно', 'недоволен', 'претензия',
  'не могу войти', 'заблокировали', 'что делать', 'куда обратиться',
];

function isSupportRequest(text: string): boolean {
  const lower = text.toLowerCase();
  return SUPPORT_TRIGGERS.some(trigger => lower.includes(trigger));
}

// ── История диалога (chat_sessions) ──────────────────────────────────────────

async function getHistory(tgChatId: string): Promise<HistoryMessage[]> {
  try {
    const res = await query<{ messages: HistoryMessage[] }>(
      `SELECT messages FROM chat_sessions WHERE session_id = $1 LIMIT 1`,
      [`tg_${tgChatId}`]
    );
    return res.rows[0]?.messages ?? [];
  } catch { return []; }
}

function saveHistory(tgChatId: string, messages: HistoryMessage[]): void {
  query(
    `INSERT INTO chat_sessions (session_id, role, messages, updated_at)
     VALUES ($1, 'tourist', $2::jsonb, NOW())
     ON CONFLICT (session_id) DO UPDATE SET messages = $2::jsonb, updated_at = NOW()`,
    [`tg_${tgChatId}`, JSON.stringify(messages.slice(-12))]
  ).catch(() => {});
}

// ── AI Кузьмич с историей ─────────────────────────────────────────────────────

async function kuzmichReply(userText: string, chatId: string): Promise<string> {
  const history = await getHistory(chatId);

  // Try to detect interests + dates from user text
  const parsed = parseInterestsFromText(userText);

  // If interests detected, fetch matching routes
  let routesText = '';
  if (parsed.interests.length > 0) {
    const routes = await findRoutesByInterests(parsed.interests, 3);
    if (routes.length > 0) {
      routesText = `\n\nВот подходящие туры:\n${formatRoutesForTelegram(routes)}`;
    }
  }

  // Build AI context
  const messages: ChatMessage[] = [
    { role: 'system', content: KUZMICH_CHAT_SYSTEM },
    ...history.slice(-8),
    { role: 'user', content: routesText ? `${userText}\n\n[Подходящие туры для ответа:${routesText}]` : userText },
  ];

  const reply = await callAIWithModelDirect(messages, getModelForAgent('kuzmich'));
  saveHistory(chatId, [...history, { role: 'user', content: userText }, { role: 'assistant', content: reply }]);
  return reply;
}

// ── Случайный маршрут ─────────────────────────────────────────────────────────

async function getRandomRoute(): Promise<RouteRow | null> {
  try {
    const res = await query<RouteRow>(
      `SELECT id::text, title, category, description FROM agent_route_knowledge
       WHERE is_visible = TRUE ORDER BY RANDOM() LIMIT 1`
    );
    return res.rows[0] ?? null;
  } catch { return null; }
}

// ── Погода (wttr.in, без API-ключа) ──────────────────────────────────────────

interface WttrCurrent {
  temp_C: string;
  FeelsLikeC: string;
  humidity: string;
  windspeedKmph: string;
  weatherDesc: Array<{ value: string }>;
  lang_ru?: Array<{ value: string }>;
}

async function getWeather(): Promise<string> {
  try {
    const res = await fetch(
      'https://wttr.in/Petropavlovsk-Kamchatsky?format=j1&lang=ru',
      { signal: AbortSignal.timeout(6000) }
    );
    if (!res.ok) throw new Error('wttr.in unavailable');
    const data = await res.json() as { current_condition: WttrCurrent[] };
    const c = data.current_condition[0];
    const desc = c.lang_ru?.[0]?.value ?? c.weatherDesc[0]?.value ?? '';
    const t = parseInt(c.temp_C);
    const f = parseInt(c.FeelsLikeC);
    const sign = (n: number) => n > 0 ? `+${n}` : String(n);
    return [
      '🌤 <b>Петропавловск-Камчатский</b>',
      '',
      `🌡 <b>${sign(t)}°C</b>  (ощущается ${sign(f)}°C)`,
      desc ? `☁️ ${esc(desc)}` : '',
      `💨 Ветер: ${c.windspeedKmph} км/ч`,
      `💧 Влажность: ${c.humidity}%`,
    ].filter(Boolean).join('\n');
  } catch {
    return 'Погода временно недоступна. Зайди позже.';
  }
}

// ── Список операторов ─────────────────────────────────────────────────────────

async function getOperatorsList(): Promise<string> {
  try {
    const res = await query<OperatorRow>(
      `SELECT name, slug FROM partners WHERE is_public = TRUE ORDER BY name LIMIT 10`
    );
    if (!res.rows.length) return 'Список операторов пока пуст.';
    const lines = ['<b>Операторы на TourHab:</b>', ''];
    res.rows.forEach(p => {
      lines.push(`🏔 <a href="https://tourhab.ru/operators/${p.slug}">${esc(p.name)}</a>`);
    });
    lines.push('', '<a href="https://tourhab.ru/operators">Все операторы →</a>');
    return lines.join('\n');
  } catch {
    return 'Не удалось загрузить список операторов.';
  }
}

// ── Admin: статистика ─────────────────────────────────────────────────────────

async function getStats(): Promise<string> {
  try {
    const [statsRes, topRes] = await Promise.all([
      query<StatsRow>(`
        SELECT
          (SELECT COUNT(*)::text FROM operator_bookings WHERE created_at >= CURRENT_DATE)             AS bookings_today,
          (SELECT COUNT(*)::text FROM operator_bookings WHERE created_at >= NOW()-INTERVAL '30 days') AS bookings_30d,
          (SELECT COUNT(*)::text FROM leads    WHERE created_at >= CURRENT_DATE)             AS leads_today,
          (SELECT COUNT(*)::text FROM leads    WHERE created_at >= NOW()-INTERVAL '30 days') AS leads_30d,
          (SELECT COUNT(*)::text FROM users)                                                 AS total_users,
          (SELECT COUNT(*)::text FROM operator_tours WHERE is_active = TRUE)                          AS active_tours,
          (SELECT COUNT(*)::text FROM page_views WHERE created_at >= CURRENT_DATE)           AS views_today,
          (SELECT COUNT(*)::text FROM page_views WHERE created_at >= NOW()-INTERVAL '30 days') AS views_30d
      `),
      query<TopPageRow>(`
        SELECT path, COUNT(*)::text AS cnt
        FROM page_views
        WHERE created_at >= NOW() - INTERVAL '7 days'
        GROUP BY path ORDER BY cnt::int DESC LIMIT 5
      `),
    ]);
    const s = statsRes.rows[0];
    const today = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    const lines = [
      `<b>Статистика TourHab</b>  <i>${today}</i>`,
      '',
      `👁 Просмотры сегодня: <b>${s.views_today}</b>   за 30 дней: <b>${s.views_30d}</b>`,
      `📦 Брони сегодня: <b>${s.bookings_today}</b>   за 30 дней: <b>${s.bookings_30d}</b>`,
      `📋 Лиды сегодня:  <b>${s.leads_today}</b>   за 30 дней: <b>${s.leads_30d}</b>`,
      '',
      `👥 Пользователей: <b>${s.total_users}</b>`,
      `🗺 Активных туров: <b>${s.active_tours}</b>`,
    ];
    if (topRes.rows.length) {
      lines.push('', '<b>Топ страниц за 7 дней:</b>');
      topRes.rows.forEach((r, i) => {
        lines.push(`${i + 1}. <code>${esc(r.path)}</code> — ${r.cnt}`);
      });
    }
    return lines.join('\n');
  } catch {
    return 'Не удалось загрузить статистику.';
  }
}

// ── Admin: последние лиды ─────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  new: 'Новый',
  contacted: 'Позвонили',
  qualified: 'Квалифицирован',
  converted: 'Сделка',
  lost: 'Отказ',
};

async function getLastLeads(): Promise<string> {
  try {
    const res = await query<LeadRow>(
      `SELECT id::text, name, phone, route_title, created_at::text, status
       FROM leads ORDER BY created_at DESC LIMIT 5`
    );
    if (!res.rows.length) return 'Заявок пока нет.';
    const lines = ['<b>Последние 5 заявок:</b>', ''];
    res.rows.forEach((l, i) => {
      const date = new Date(l.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      const statusLabel = STATUS_LABEL[l.status] ?? l.status;
      lines.push(`${i + 1}. <b>${esc(l.name)}</b>  <code>${esc(l.phone)}</code>  [${statusLabel}]`);
      if (l.route_title) lines.push(`   ${esc(l.route_title)}`);
      lines.push(`   <i>${date}</i>  <code>${l.id}</code>`);
    });
    return lines.join('\n');
  } catch {
    return 'Не удалось загрузить лиды.';
  }
}

async function updateLeadStatus(leadId: string, status: string): Promise<{ name: string; phone: string } | null> {
  try {
    const res = await query<{ name: string; phone: string }>(
      `UPDATE leads SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING name, phone`,
      [status, leadId]
    );
    return res.rows[0] ?? null;
  } catch { return null; }
}

// ── Lead creation from bot ───────────────────────────────────────────────────

interface ExtractedInterests {
  interests?: string[];
  dateFrom?: string;
  dateTo?: string;
}

function extractLastInterestsFromHistory(history: HistoryMessage[]): ExtractedInterests {
  for (let i = history.length - 1; i >= Math.max(0, history.length - 10); i--) {
    if (history[i]?.role === 'user') {
      const parsed = parseInterestsFromText(history[i].content);
      if (parsed.interests.length > 0) return parsed;
    }
  }
  return {};
}

interface OperatorRow2 { name: string; slug: string; telegram_chat_id: string | null }

async function createLeadFromBot(
  chatId: string,
  phoneText: string,
  interests: ExtractedInterests
): Promise<void> {
  try {
    const phone = phoneText;
    const interestList = interests.interests ?? [];
    const comment = interestList.length > 0
      ? `Интересы: ${interestList.join(', ')}${interests.dateFrom ? ` · Даты: ${interests.dateFrom} - ${interests.dateTo}` : ''}`
      : 'Заявка с Telegram бота';

    const leadId = await createLead({
      name: 'Турист',
      phone,
      comment,
      source_url: 'https://t.me/KuzmichKam_bot',
      source_data: {
        source: 'telegram_bot',
        interests: interestList,
        date_from: interests.dateFrom,
        date_to: interests.dateTo,
        chat_id: chatId,
        timestamp: new Date().toISOString(),
      },
      telegram_chat_id: chatId,
    });

    // ── 1. Автоответ туристу ───────────────────────────────────────────────
    const routes = interestList.length > 0
      ? await findRoutesByInterests(interestList, 2)
      : [];

    const touristLines = [
      '✅ <b>Заявка принята!</b>',
      '',
      'Оператор свяжется с вами в течение <b>1–2 часов</b> по номеру',
      `<b>${esc(phone)}</b>`,
    ];

    if (routes.length > 0) {
      touristLines.push('', '<b>Пока посмотрите подходящие маршруты:</b>');
      routes.forEach((r, i) => {
        const price = r.priceFrom ? ` — от ${Math.round(r.priceFrom / 1000)}к₽` : '';
        touristLines.push(`${i + 1}. <a href="https://tourhab.ru/routes/${r.id}">${esc(r.title)}</a>${price}`);
      });
    }

    touristLines.push('', 'Если вопросы — пишите прямо здесь, помогу 🙌');

    await telegramService.sendMessage({
      chatId,
      text: touristLines.join('\n'),
      parseMode: 'HTML',
    }).catch(() => {});

    // ── 2. Уведомление нужному оператору ──────────────────────────────────
    if (interestList.length > 0) {
      const opRes = await pool.query<OperatorRow2>(
        `SELECT p.name, p.slug, p.contacts->>'telegram_chat_id' AS telegram_chat_id
         FROM partners p
         JOIN operator_tours ot ON ot.operator_id = p.user_id
         JOIN agent_route_knowledge ark ON ark.id = ot.route_id
         WHERE ark.activity_type = ANY($1)
           AND p.is_public = TRUE
           AND (p.contacts->>'telegram_chat_id') IS NOT NULL
         GROUP BY p.name, p.slug, p.contacts->>'telegram_chat_id'
         LIMIT 3`,
        [interestList]
      );

      for (const op of opRes.rows) {
        if (!op.telegram_chat_id) continue;
        await telegramService.sendMessage({
          chatId: op.telegram_chat_id,
          text: [
            '🔥 <b>Горячий лид!</b>',
            '',
            `<b>Телефон:</b> <a href="tel:${phone}">${phone}</a>`,
            `<b>Интересы:</b> ${interestList.join(', ')}`,
            interests.dateFrom ? `<b>Даты:</b> ${interests.dateFrom} — ${interests.dateTo}` : '',
            '',
            '⚡️ Свяжитесь в течение 1–2 часов — турист ждёт!',
            `<a href="https://tourhab.ru/hub/operator/bookings">Открыть в CRM →</a>`,
          ].filter(s => s !== '').join('\n'),
          parseMode: 'HTML',
        }).catch(() => {});
      }
    }

    // Уведомление админу отправлено автоматически через createLead()

  } catch (err) {
  }
}

// ── Создание лида из Telegram /start lead flow ────────────────────────────────
async function createLeadFromTelegramFlow(
  chatId: string,
  firstName: string,
  telegramUserId: number,
  telegramUsername: string | null,
  message: string,
): Promise<void> {
  try {
    const leadId = await createLead({
      name: firstName,
      phone: telegramUsername ? `@${telegramUsername}` : `tg:${telegramUserId}`,
      comment: message,
      source_url: 'https://t.me/KuzmichKam_bot',
      source_data: {
        source: 'telegram_lead_flow',
        telegram_user_id: telegramUserId,
        telegram_username: telegramUsername,
        chat_id: chatId,
      },
      telegram_chat_id: chatId,
    });
    if (!leadId) return;

    // AI обработка — после завершения отвечаем туристу в ТГ
    try {
      const proposal = await leadProcessor.process(leadId);
      const lines = [
        `<b>${esc(proposal.headline)}</b>`,
        '',
        proposal.intent.activity_types.length > 0
          ? `Направление: ${proposal.intent.activity_types.join(', ')}`
          : '',
        proposal.intent.group_size > 1 ? `Группа: ${proposal.intent.group_size} чел.` : '',
        proposal.intent.budget_rub ? `Бюджет: ~${(proposal.intent.budget_rub / 1000).toFixed(0)}к руб` : '',
        proposal.intent.desired_dates ? `Даты: ${esc(proposal.intent.desired_dates)}` : '',
        '',
        proposal.primary_tour
          ? `<b>Рекомендую:</b> ${esc(proposal.primary_tour.title)} — от ${proposal.primary_tour.price.toLocaleString('ru-RU')} руб/чел`
          : '',
        '',
        `<i>${esc(proposal.intent.qualification_notes)}</i>`,
        '',
        'Менеджер свяжется с вами в ближайшее время для уточнения деталей.',
      ].filter(Boolean).join('\n');

      await sendHTML(chatId, lines);
    } catch {
      // AI не отработал — уже отправили "принято", достаточно
    }
  } catch {
    // Тихая ошибка
  }
}

// ── Основной обработчик ───────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const secret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  let update: TelegramUpdate;
  try {
    const json = await request.json();
    const parsed = TelegramUpdateSchema.safeParse(json);
    if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });
    update = parsed.data as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // ── Текстовые сообщения ───────────────────────────────────────────────────
  if (update.message?.text && update.message.chat) {
    const chatId  = String(update.message.chat.id);
    const fromId  = update.message.from?.id ?? 0;
    const text    = update.message.text.trim();
    const admin   = isAdmin(fromId);

    // ── Группы и супергруппы: тихий мониторинг ─────────────────────────────
    const chatType = (update.message.chat as { type?: string }).type ?? 'private';
    if (chatType === 'group' || chatType === 'supergroup') {
      const groupTitle = (update.message.chat as { title?: string }).title ?? 'Группа';
      const fromName   = update.message.from?.first_name ?? 'Участник';

      // Собираем разведку асинхронно — не блокируем ответ Telegram
      groupMonitor.processMessage(chatId, groupTitle, fromName, text);

      // Отвечаем только если прямо @упомянули бота
      const botUser = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME ?? 'KuzmichKam_bot';
      const mentioned = text.toLowerCase().includes(`@${botUser.toLowerCase()}`);
      if (mentioned) {
        const cleanQ = text.replace(new RegExp(`@${botUser}`, 'gi'), '').trim();
        const reply  = await kuzmichReply(cleanQ || 'Привет! Чем помочь?', chatId);
        await sendHTML(chatId, reply);
      }

      return NextResponse.json({ ok: true });
    }

    // /start [link_{token}] — привязка аккаунта или приветствие
    if (text.startsWith('/start')) {
      const arg = text.slice('/start'.length).trim();

      // /start link_{token} — привязка email-аккаунта к Telegram
      if (arg.startsWith('link_')) {
        const token = arg.slice('link_'.length);
        const userId = verifyConnectToken(token);

        if (!userId) {
          await sendHTML(chatId, [
            '<b>Ссылка недействительна или истекла.</b>',
            '',
            'Получи новую в личном кабинете: Профиль → Подключить Telegram.',
          ].join('\n'));
          return NextResponse.json({ ok: true });
        }

        // Связываем telegram_id с аккаунтом
        const linkRes = await query<{ name: string; role: string }>(
          `UPDATE users SET telegram_id = $1, telegram_username = $2
           WHERE id = $3 AND (telegram_id IS NULL OR telegram_id = $1)
           RETURNING name, role`,
          [update.message.from.id, update.message.from.username ?? null, userId]
        );

        if (!linkRes.rows[0]) {
          await sendHTML(chatId, 'Аккаунт уже привязан к другому Telegram. Обратись в поддержку.');
          return NextResponse.json({ ok: true });
        }

        const { name, role } = linkRes.rows[0];

        // Если оператор/гид — обновляем partners.telegram_chat_id
        if (role === 'operator' || role === 'guide') {
          await query(
            `UPDATE partners SET telegram_chat_id = $1 WHERE user_id = $2`,
            [update.message.from.id, userId]
          ).catch(() => null);
        }

        // Отправляем персональное приветствие
        void sendWelcomeMessage(userId, {
          telegramId: update.message.from.id,
          name,
          role,
          isNewUser: false,
        });

        return NextResponse.json({ ok: true });
      }

      // /start lead — турист хочет оставить заявку
      if (arg === 'lead') {
        const firstName = update.message?.from?.first_name ?? 'Путешественник';
        pendingLeadFlow.set(chatId, { firstName, startedAt: Date.now() });
        await sendHTML(chatId, [
          `<b>Привет, ${firstName}! Я — Кузьмич.</b>`,
          '',
          'Расскажите о своей поездке — подберу лучший тур:',
          '',
          '• Что хотите (вулканы, медведи, рыбалка, термалки...)',
          '• Примерные даты или сезон',
          '• Сколько человек',
          '• Примерный бюджет на всех',
          '',
          '<i>Пришлю персональное предложение прямо сюда через 1–2 минуты.</i>',
        ].join('\n'));
        return NextResponse.json({ ok: true });
      }

      // /start без параметра — проверяем знаем ли мы этого пользователя
      const linkedUser = await getUserByTelegramId(fromId);

      if (linkedUser) {
        const firstName = linkedUser.name.split(' ')[0];
        const roleLabel: Record<string, string> = {
          tourist: 'Рад снова видеть тебя',
          operator: 'Кабинет оператора',
          guide: 'Кабинет гида',
          agent: 'Кабинет агента',
          admin: 'Командный центр',
        };
        await sendHTML(chatId, [
          `<b>${roleLabel[linkedUser.role] ?? 'Привет'}, ${firstName}!</b>`,
          '',
          'Твой личный канал активен. Команды:',
          '/help — всё что я умею',
          '/route — случайный маршрут',
          '/weather — погода сейчас',
          '',
          'Или просто спроси — отвечу.',
        ].join('\n'));
      } else {
        await sendHTML(chatId, [
          '<b>Привет! Я — Кузьмич.</b>',
          '',
          'Камчадал в третьем поколении, прошёл больше 300 маршрутов.',
          'Знаю Камчатку как свои пять пальцев — вулканы, медведи, рыбалка, термалки.',
          '',
          '<b>Что умею:</b>',
          '/route — случайный маршрут',
          '/weather — погода сейчас',
          '/tip — совет путешественнику',
          '/operators — список партнёров',
          '/sezon — что актуально прямо сейчас',
          '/help — полный список',
          '',
          'Или просто спроси — отвечу честно.',
          '',
          'Уже зарегистрирован на <a href="https://tourhab.ru">tourhab.ru</a>? Привяжи аккаунт в профиле — и я буду знать о твоих поездках.',
        ].join('\n'));
      }
      return NextResponse.json({ ok: true });
    }

    // /login — magic link для входа на сайт (только для привязанных admin/operator/guide)
    if (text.startsWith('/login')) {
      const linkedUser = await getUserByTelegramId(fromId);
      if (!linkedUser) {
        await sendHTML(chatId, [
          '<b>Аккаунт не привязан.</b>',
          '',
          'Зарегистрируйся на <a href="https://tourhab.ru">tourhab.ru</a>',
          'и привяжи Telegram в разделе Профиль.',
        ].join('\n'));
        return NextResponse.json({ ok: true });
      }

      // Генерируем magic token (15 минут)
      const { SignJWT } = await import('jose');
      const secret = new TextEncoder().encode('magic:' + (process.env.JWT_SECRET ?? ''));
      const magicToken = await new SignJWT({ userId: linkedUser.id })
        .setProtectedHeader({ alg: 'HS256' })
        .setExpirationTime('15m')
        .sign(secret);

      const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://tourhab.ru';
      const link = `${siteUrl}/api/auth/magic?token=${magicToken}`;

      await sendHTML(chatId, [
        `<b>Привет, ${linkedUser.name.split(' ')[0]}!</b>`,
        '',
        'Нажми кнопку ниже — войдёшь без пароля.',
        '<i>Ссылка действует 15 минут.</i>',
        '',
        `<a href="${link}">Войти в систему →</a>`,
      ].join('\n'));
      return NextResponse.json({ ok: true });
    }

    // /help
    if (text.startsWith('/help')) {
      const adminBlock = admin
        ? '\n<b>Админ:</b>\n/stats — статистика\n/leads — последние заявки\n/groups — мониторинг групп\n/digest — AI дайджест\n/agent &lt;текст&gt; — PlatformAgent\n/approve_&lt;id&gt; | /reject_&lt;id&gt; — решение по запросу агента\n/post operator &lt;slug&gt;\n/post route &lt;uuid&gt;\n/post sezon — AI-пост в канал'
        : '';
      await sendHTML(chatId, [
        '<b>Команды Кузьмича:</b>',
        '',
        '/route — случайный маршрут из каталога',
        '/weather — погода в Петропавловске',
        '/tip — случайный совет',
        '/operators — список партнёров',
        '/sezon — совет по сезону',
        adminBlock,
        '',
        'Или просто напиши вопрос — отвечу как местный.',
        '',
        '<a href="https://tourhab.ru/routes">Все маршруты →</a>',
      ].filter(s => s !== '').join('\n'));
      return NextResponse.json({ ok: true });
    }

    // /weather
    if (text.startsWith('/weather')) {
      const weather = await getWeather();
      await sendHTML(chatId, weather);
      return NextResponse.json({ ok: true });
    }

    // /tip
    if (text.startsWith('/tip')) {
      const tip = await callAIWithModelDirect([
        { role: 'system', content: KUZMICH_CHAT_SYSTEM },
        { role: 'user', content: 'Дай один конкретный практический совет туристу, который едет на Камчатку первый раз. Не общие слова — что-то реально полезное из личного опыта.' },
      ], getModelForAgent('kuzmich'));
      await sendHTML(chatId, tip);
      return NextResponse.json({ ok: true });
    }

    // /operators
    if (text.startsWith('/operators')) {
      const list = await getOperatorsList();
      await sendHTML(chatId, list);
      return NextResponse.json({ ok: true });
    }

    // /route
    if (text.startsWith('/route')) {
      const route = await getRandomRoute();
      if (!route) {
        await sendHTML(chatId, 'Маршруты загружаются. Загляни сам: <a href="https://tourhab.ru/routes">tourhab.ru/routes</a>');
      } else {
        const desc = route.description ? route.description.slice(0, 220).trimEnd() + '…' : '';
        await sendHTML(chatId, [
          `<b>${esc(route.title)}</b>`,
          '',
          desc,
          '',
          `<a href="https://tourhab.ru/routes/${route.id}">Подробнее на TourHab →</a>`,
        ].filter(Boolean).join('\n'));
      }
      return NextResponse.json({ ok: true });
    }

    // /sezon
    if (text.startsWith('/sezon')) {
      const month = new Date().toLocaleString('ru-RU', { month: 'long' });
      const answer = await kuzmichReply(
        `Сейчас ${month}. Один конкретный совет: что стоит делать туристу на Камчатке прямо сейчас?`,
        chatId
      );
      await sendHTML(chatId, answer);
      return NextResponse.json({ ok: true });
    }

    // ── Admin-команды ─────────────────────────────────────────────────────────

    // /stats
    if (text.startsWith('/stats')) {
      if (!admin) {
        await sendHTML(chatId, '<b>Нет прав.</b>');
        return NextResponse.json({ ok: true });
      }
      const stats = await getStats();
      await sendHTML(chatId, stats);
      return NextResponse.json({ ok: true });
    }

    // /leads
    if (text.startsWith('/leads')) {
      if (!admin) {
        await sendHTML(chatId, '<b>Нет прав.</b>');
        return NextResponse.json({ ok: true });
      }
      const leads = await getLastLeads();
      await sendHTML(chatId, leads);
      return NextResponse.json({ ok: true });
    }

    // /groups — мониторинг Telegram-групп (только admin)
    if (text.startsWith('/groups')) {
      if (!admin) {
        await sendHTML(chatId, '<b>Нет прав.</b>');
        return NextResponse.json({ ok: true });
      }
      const groups = await groupMonitor.getMonitoredGroups();
      if (!groups.length) {
        await sendHTML(chatId, 'Группы ещё не добавлены.\n\nДобавь бота в туристическую группу в Telegram — он начнёт собирать разведку автоматически.\n\n<i>Не забудь отключить privacy mode в BotFather: /setprivacy → Disabled</i>');
        return NextResponse.json({ ok: true });
      }
      const lines = ['<b>Мониторируемые группы:</b>', ''];
      for (const g of groups) {
        const lastAct = new Date(g.lastActivityAt).toLocaleDateString('ru-RU');
        lines.push(`📡 <b>${esc(g.title)}</b>`);
        lines.push(`   Сообщений: ${g.totalMessages}  ·  Активность: ${lastAct}`);
        lines.push(`   ID: <code>${g.id}</code>`);
        lines.push('');
      }
      const recent = await groupMonitor.getRecentIntel(5);
      if (recent.length > 0) {
        lines.push('<b>Последние находки:</b>', '');
        for (const r of recent) {
          const d = new Date(r.date).toLocaleDateString('ru-RU');
          lines.push(`📌 <b>${esc(r.group)}</b>  <i>${d}</i>  (${r.messages} сообщ.)`);
          if (r.intel.key_insights?.length) {
            r.intel.key_insights.slice(0, 2).forEach(i => lines.push(`   • ${esc(i)}`));
          }
          if (r.intel.hot_signals?.length) {
            r.intel.hot_signals.slice(0, 1).forEach(s => lines.push(`   🔥 ${esc(s)}`));
          }
          lines.push('');
        }
      }
      await sendHTML(chatId, lines.join('\n'));
      return NextResponse.json({ ok: true });
    }

    // /digest — AI дайджест платформы (только admin)
    if (text.startsWith('/digest')) {
      if (!admin) {
        await sendHTML(chatId, '<b>Нет прав.</b>');
        return NextResponse.json({ ok: true });
      }
      await sendHTML(chatId, 'Формирую дайджест...');
      try {
        const digestText = await PlatformAgent.digest();
        await sendHTML(chatId, digestText);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await sendHTML(chatId, `Ошибка дайджеста: <code>${esc(msg)}</code>`);
      }
      return NextResponse.json({ ok: true });
    }

    // /agent <text> — прямой вызов PlatformAgent (только admin)
    if (text.startsWith('/agent')) {
      if (!admin) {
        await sendHTML(chatId, '<b>Нет прав.</b>');
        return NextResponse.json({ ok: true });
      }
      const agentMsg = text.slice('/agent'.length).trim();
      if (!agentMsg) {
        await sendHTML(chatId, 'Использование: <code>/agent &lt;запрос&gt;</code>\nПример: <code>/agent мои туры</code>');
        return NextResponse.json({ ok: true });
      }
      await sendHTML(chatId, 'Обрабатываю...');
      try {
        const result = await PlatformAgent.dispatch({ message: agentMsg, role: 'admin' });
        const header = `<i>intent: ${result.intent} | ${result.duration_ms}ms</i>\n\n`;
        await sendHTML(chatId, header + result.response);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await sendHTML(chatId, `Ошибка агента: <code>${esc(msg)}</code>`);
      }
      return NextResponse.json({ ok: true });
    }

    // /approve_<shortId> — одобрить действие агента (только admin)
    if (text.startsWith('/approve_') && admin) {
      const shortId = text.slice('/approve_'.length).trim().slice(0, 8);
      try {
        const { rows } = await pool.query<{ id: string }>(
          `SELECT id FROM agent_approvals WHERE id::text LIKE $1 AND status = 'pending' LIMIT 1`,
          [`${shortId}%`]
        );
        if (!rows[0]) {
          await sendHTML(chatId, `Запрос одобрения не найден: <code>${esc(shortId)}</code>`);
        } else {
          const { rows: adminUsers } = await pool.query<{ id: number }>(
            `SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1`
          );
          const reviewerId = adminUsers[0]?.id;
          if (!reviewerId) {
            await sendHTML(chatId, 'Ошибка: admin пользователь не найден в БД.');
          } else {
            await approvalRequired.approve(rows[0].id, reviewerId, 'Одобрено через Telegram');
            await sendHTML(chatId, `Одобрено: <code>${rows[0].id.slice(0, 8)}</code>`);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await sendHTML(chatId, `Ошибка: <code>${esc(msg)}</code>`);
      }
      return NextResponse.json({ ok: true });
    }

    // /reject_<shortId> — отклонить действие агента (только admin)
    if (text.startsWith('/reject_') && admin) {
      const shortId = text.slice('/reject_'.length).trim().slice(0, 8);
      try {
        const { rows } = await pool.query<{ id: string }>(
          `SELECT id FROM agent_approvals WHERE id::text LIKE $1 AND status = 'pending' LIMIT 1`,
          [`${shortId}%`]
        );
        if (!rows[0]) {
          await sendHTML(chatId, `Запрос одобрения не найден: <code>${esc(shortId)}</code>`);
        } else {
          const { rows: adminUsers } = await pool.query<{ id: number }>(
            `SELECT id FROM users WHERE role = 'admin' ORDER BY id LIMIT 1`
          );
          const reviewerId = adminUsers[0]?.id;
          if (!reviewerId) {
            await sendHTML(chatId, 'Ошибка: admin пользователь не найден в БД.');
          } else {
            await approvalRequired.reject(rows[0].id, reviewerId, 'Отклонено через Telegram');
            await sendHTML(chatId, `Отклонено: <code>${rows[0].id.slice(0, 8)}</code>`);
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await sendHTML(chatId, `Ошибка: <code>${esc(msg)}</code>`);
      }
      return NextResponse.json({ ok: true });
    }

    // /migrate — применить миграцию (только admin)
    if (text.startsWith('/migrate')) {
      if (!admin) {
        await sendHTML(chatId, '<b>Нет прав.</b>');
        return NextResponse.json({ ok: true });
      }
      try {
        await query(`
          ALTER TABLE leads
            ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'new'
              CHECK (status IN ('new','contacted','qualified','converted','lost')),
            ADD COLUMN IF NOT EXISTS notes TEXT,
            ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        `);
        await query(`CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status, created_at DESC)`);
        await sendHTML(chatId, '✅ Migration 043 applied: leads.status + notes + updated_at');
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        await sendHTML(chatId, `❌ Migration error: <code>${esc(msg)}</code>`);
      }
      return NextResponse.json({ ok: true });
    }

    // /diag — диагностика env vars (только admin)
    if (text.startsWith('/diag')) {
      if (!admin) {
        await sendHTML(chatId, '<b>Нет прав.</b>');
        return NextResponse.json({ ok: true });
      }
      const vars = [
        ['TELEGRAM_BOT_TOKEN',      process.env.TELEGRAM_BOT_TOKEN],
        ['TELEGRAM_CHAT_ID',        process.env.TELEGRAM_CHAT_ID],
        ['TELEGRAM_CHANNEL_ID',     process.env.TELEGRAM_CHANNEL_ID],
        ['TELEGRAM_LEADS_CHAT_ID',  process.env.TELEGRAM_LEADS_CHAT_ID],
        ['ANTHROPIC_API_KEY',       process.env.ANTHROPIC_API_KEY],
        ['OPENROUTER_API_KEY',      process.env.OPENROUTER_API_KEY],
        ['NEXT_PUBLIC_YANDEX_METRIKA_ID', process.env.NEXT_PUBLIC_YANDEX_METRIKA_ID],
      ];
      const lines = ['<b>Env vars (✅ = задан, ❌ = не задан):</b>', ''];
      for (const [name, val] of vars) {
        const ok = val && val.trim().length > 0;
        const preview = ok ? ` <code>${String(val).slice(0, 6)}…</code>` : '';
        lines.push(`${ok ? '✅' : '❌'} <code>${name}</code>${preview}`);
      }
      await sendHTML(chatId, lines.join('\n'));
      return NextResponse.json({ ok: true });
    }

    // /post
    if (text.startsWith('/post')) {
      if (!admin) {
        await sendHTML(chatId, '<b>Нет прав.</b> Команда только для администратора.');
        return NextResponse.json({ ok: true });
      }
      const parts = text.split(/\s+/);
      const kind = parts[1];
      const arg  = parts[2];

      // /post sezon
      if (kind === 'sezon') {
        await sendHTML(chatId, 'Генерирую сезонный пост…');
        const result = await postSezonToChannel();
        await sendHTML(chatId, result.ok ? 'Сезонный пост опубликован.' : `Ошибка: ${result.error}`);
        return NextResponse.json({ ok: true });
      }

      // /post friend <slug>
      if (kind === 'friend') {
        if (!arg) {
          await sendHTML(chatId, 'Используй: <code>/post friend soulful</code>');
          return NextResponse.json({ ok: true });
        }
        await sendHTML(chatId, `Генерирую пост про друзей (${arg})…`);
        const result = await postFriendToChannel(arg);
        await sendHTML(chatId, result.ok ? 'Пост опубликован.' : `Ошибка: ${result.error ?? 'неизвестная'}`);
        return NextResponse.json({ ok: true });
      }

      if (!kind || !arg) {
        await sendHTML(chatId, [
          '<b>/post — публикация в канал</b>',
          '',
          '<code>/post operator kamchatskaya-rybalka</code>',
          '<code>/post route &lt;uuid&gt;</code>',
          '<code>/post sezon</code>  — AI сезонный пост',
          '<code>/post friend soulful</code>  — пост про друзей',
        ].join('\n'));
        return NextResponse.json({ ok: true });
      }

      let result: { ok: boolean; error?: string };
      if (kind === 'operator') {
        result = await postOperatorToChannel(arg);
      } else if (kind === 'route') {
        result = await postRouteToChannel(arg);
      } else {
        await sendHTML(chatId, 'Используй: <code>operator</code>, <code>route</code>, <code>sezon</code> или <code>friend</code>.');
        return NextResponse.json({ ok: true });
      }
      await sendHTML(chatId, result.ok ? '✅ Пост опубликован.' : `❌ Ошибка: ${result.error ?? 'неизвестная'}`);
      return NextResponse.json({ ok: true });
    }

    // Любой обычный текст → проверяю телефон или AI Кузьмич
    if (!text.startsWith('/')) {
      // Пользователь в процессе оформления заявки через /start lead
      const pendingLead = pendingLeadFlow.get(chatId);
      if (pendingLead) {
        pendingLeadFlow.delete(chatId);
        await sendHTML(chatId, [
          '✅ <b>Заявка принята!</b>',
          '',
          'Анализирую запрос, подбираю туры.',
          'Пришлю предложение прямо сюда через 1–2 минуты.',
        ].join('\n'));
        void createLeadFromTelegramFlow(
          chatId, pendingLead.firstName, fromId,
          update.message?.from?.username ?? null, text
        ).catch((err) => console.error('[tg webhook] createLeadFromTelegramFlow failed:', err));
        return NextResponse.json({ ok: true });
      }

      // Check if text looks like phone number
      const phoneMatch = text.match(/[\d+\-() ]{7,}/);
      if (phoneMatch) {
        const phoneText = phoneMatch[0].trim();
        // Try to extract last known interests from chat history
        const history = await getHistory(chatId);
        const lastIntests = extractLastInterestsFromHistory(history);

        if (lastIntests.interests && lastIntests.interests.length > 0) {
          // User responded with phone after seeing tours
          await createLeadFromBot(chatId, phoneText, lastIntests);
          await sendHTML(chatId, '✅ Спасибо! Оператор свяжется с вами в ближайшее время.');
          return NextResponse.json({ ok: true });
        }
      }

      // Поддержка: обращение в тикет-систему
      if (isSupportRequest(text)) {
        const linkedUser = await getUserByTelegramId(fromId);

        if (linkedUser) {
          // Проверяем открытые тикеты
          const openTickets = await getUserOpenTickets(linkedUser.id);

          if (openTickets.length > 0) {
            // Добавляем сообщение к существующему тикету
            const ticket = openTickets[0];
            await addTicketMessage(ticket.id, { role: 'user', text });
            await sendHTML(chatId, [
              `<b>Тикет #${ticket.id.slice(0, 8)} обновлён</b>`,
              '',
              `Категория: ${CATEGORY_LABELS[ticket.category]}`,
              `Статус: рассматривается Резидентом ${ticket.assignedAgent ?? 'Admin'}`,
              '',
              'Ответим в ближайшее время.',
            ].join('\n'));
          } else {
            // Создаём новый тикет
            const { category, resident } = categorizeSupport(text);
            const ticket = await createTicket({
              userId:       linkedUser.id,
              channel:      'telegram',
              subject:      text.slice(0, 100),
              firstMessage: text,
            });
            await sendHTML(chatId, [
              '<b>Обращение принято!</b>',
              '',
              `Тикет: <code>#${ticket.id.slice(0, 8)}</code>`,
              `Категория: ${CATEGORY_LABELS[category]}`,
              '',
              RESIDENT_INTRO[resident] ?? `Назначен Резидент ${resident}.`,
              '',
              'Срок ответа: до 2 часов в рабочее время.',
              'Продолжай писать здесь — я передам ответ.',
            ].join('\n'));
          }
          return NextResponse.json({ ok: true });
        } else {
          // Незарегистрированный пользователь — направляем к регистрации
          await sendHTML(chatId, [
            'Для обращения в поддержку нужен аккаунт на TourHab.',
            '',
            'Зарегистрируйся на <a href="https://tourhab.ru/auth/register">tourhab.ru</a> и привяжи Telegram в профиле.',
            'Или опиши проблему — помогу решить здесь.',
          ].join('\n'));
          // Не возвращаем — пусть Кузьмич тоже ответит
        }
      }

      // Admin free-form → keyword-only intent dispatch (без AI-классификации)
      if (admin) {
        const keywordIntent = classifyIntentByKeywords(text, 'admin');
        if (keywordIntent !== 'unknown') {
          try {
            const agentResult = await PlatformAgent.dispatch({ message: text, role: 'admin' });
            await sendHTML(chatId, agentResult.response);
            return NextResponse.json({ ok: true });
          } catch {
            // на ошибке агента — уходим в kuzmichReply
          }
        }
      }

      // Regular AI chat
      const answer = await kuzmichReply(text, chatId);
      await sendHTML(chatId, answer);
      return NextResponse.json({ ok: true });
    }
  }

  // ── callback_query (кнопки лидов + бронирования) ────────────────────────
  if (update.callback_query) {
    const cq             = update.callback_query;
    const senderChatId   = cq.from.id;
    const callbackChatId = String(cq.message?.chat?.id ?? senderChatId);
    const data           = cq.data ?? '';

    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

    // ── Admin quick-action кнопки (из дайджеста) ──────────────────────────
    if (data.startsWith('admin:') && isAdmin(senderChatId)) {
      await telegramService.answerCallback(cq.id);
      const action = data.slice('admin:'.length);

      if (action === 'leads') {
        const leadsText = await getLastLeads();
        await sendHTML(callbackChatId, leadsText);
      } else if (action === 'stats') {
        const statsText = await getStats();
        await sendHTML(callbackChatId, statsText);
      } else if (action === 'bookings') {
        try {
          const r = await query<{
            id: string; tour_title: string | null;
            guest_name: string; guest_phone: string;
            booking_date: string; booking_status: string;
          }>(
            `SELECT ob.id::text, ot.title as tour_title, ob.tourist_name as guest_name, ob.tourist_phone as guest_phone,
                    ob.booking_date::text, ob.booking_status
             FROM operator_bookings ob
             LEFT JOIN operator_tours ot ON ot.id = ob.operator_tour_id
             ORDER BY ob.created_at DESC LIMIT 8`
          );
          if (!r.rows.length) {
            await sendHTML(callbackChatId, 'Бронирований пока нет.');
          } else {
            const lines = ['<b>Последние бронирования:</b>', ''];
            r.rows.forEach((b, i) => {
              const date = b.booking_date ? new Date(b.booking_date).toLocaleDateString('ru-RU') : '—';
              lines.push(`${i + 1}. <b>${esc(b.guest_name)}</b>  <code>${esc(b.guest_phone)}</code>  [${b.booking_status}]`);
              if (b.tour_title) lines.push(`   ${esc(b.tour_title)}  ${date}`);
            });
            await sendHTML(callbackChatId, lines.join('\n'));
          }
        } catch {
          await sendHTML(callbackChatId, 'Не удалось загрузить бронирования.');
        }
      } else if (action === 'help') {
        await sendHTML(callbackChatId, [
          '<b>Команды Кузьмича (admin):</b>',
          '',
          '/stats — статистика платформы',
          '/leads — последние заявки',
          '/digest — AI-дайджест сейчас',
          '/agent &lt;текст&gt; — PlatformAgent',
          '/approve_&lt;id&gt; — одобрить инициативу',
          '/reject_&lt;id&gt; — отклонить инициативу',
          '/post sezon | operator &lt;slug&gt; | route &lt;id&gt;',
          '/diag — диагностика env',
          '',
          'Или просто напиши запрос — Кузьмич поймёт.',
          'Примеры: "покажи лиды за сегодня", "сколько пользователей"',
        ].join('\n'));
      }
      return NextResponse.json({ ok: true });
    }

    // ── Кнопки статуса лида (только admin) ────────────────────────────────
    const LEAD_STATUSES: Record<string, string> = {
      'lead_contacted': 'contacted',
      'lead_qualified': 'qualified',
      'lead_converted': 'converted',
      'lead_lost':      'lost',
    };

    const leadPrefix = Object.keys(LEAD_STATUSES).find(p => data.startsWith(p + ':'));
    if (leadPrefix) {
      if (!isAdmin(senderChatId)) {
        await telegramService.answerCallback(cq.id, 'Нет прав');
        return NextResponse.json({ ok: true });
      }
      const leadId = data.slice(leadPrefix.length + 1);
      const newStatus = LEAD_STATUSES[leadPrefix];
      const lead = await updateLeadStatus(leadId, newStatus);
      if (lead) {
        const label = STATUS_LABEL[newStatus] ?? newStatus;
        await telegramService.answerCallback(cq.id, `${label}: ${lead.name}`);
        await sendHTML(callbackChatId, `Лид <b>${esc(lead.name)}</b> — статус: <b>${label}</b>\n<code>${leadId}</code>`);
      } else {
        await telegramService.answerCallback(cq.id, 'Лид не найден');
      }
      return NextResponse.json({ ok: true });
    }

    if (!(await isAuthorizedOperator(senderChatId))) {
      await telegramService.answerCallback(cq.id, 'Нет прав');
      return NextResponse.json({ ok: true });
    }

    if (data.startsWith('confirm_')) {
      const match = data.match(uuidPattern);
      if (!match) { await telegramService.answerCallback(cq.id, 'Неверный формат'); return NextResponse.json({ ok: true }); }
      try {
        const booking = await confirmBooking(match[0], `tg:${senderChatId}`);
        await telegramService.answerCallback(cq.id, 'Подтверждено!');
        await telegramService.sendMessage({
          chatId: callbackChatId,
          text: `<b>Бронирование подтверждено</b>\nТур: ${booking.tour.title}\nДата: ${booking.date.toLocaleDateString('ru-RU')}\nУчастников: ${booking.participants}\nID: ${match[0]}`,
          parseMode: 'HTML',
        });
        // Уведомляем туриста в его личный канал
        notifyTouristBookingConfirmed(booking.tourist.id, {
          id:           match[0],
          tourTitle:    booking.tour.title,
          date:         booking.date,
          participants: booking.participants,
        });
      } catch (err) {
        await telegramService.answerCallback(cq.id, err instanceof Error ? err.message : 'Ошибка');
      }

    } else if (data.startsWith('cancel_')) {
      const match = data.match(uuidPattern);
      if (!match) { await telegramService.answerCallback(cq.id, 'Неверный формат'); return NextResponse.json({ ok: true }); }
      try {
        const { booking, refund } = await cancelBooking(match[0], `tg:${senderChatId}`, 'operator', 'Отменено оператором через Telegram');
        await telegramService.answerCallback(cq.id, 'Отменено');
        await telegramService.sendMessage({
          chatId: callbackChatId,
          text: `<b>Бронирование отменено</b>\nТур: ${booking.tour.title}\nID: ${match[0]}`,
          parseMode: 'HTML',
        });
        // Уведомляем туриста в его личный канал
        notifyTouristBookingCancelled(booking.tourist.id, {
          id:            match[0],
          tourTitle:     booking.tour.title,
          cancelledBy:   'operator',
          refundPercent: refund.percent,
          refundAmount:  refund.amount,
          refundReason:  refund.reason,
        });
      } catch (err) {
        await telegramService.answerCallback(cq.id, err instanceof Error ? err.message : 'Ошибка');
      }

    } else {
      await telegramService.answerCallback(cq.id);
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
