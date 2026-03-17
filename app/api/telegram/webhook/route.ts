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
 *   /post operator slug — публикация оператора в канал
 *   /post route uuid    — публикация маршрута в канал
 *   /post sezon         — AI генерирует сезонный пост в канал
 *
 * Безопасность: X-Telegram-Bot-Api-Secret-Token
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { telegramService } from '@/lib/notifications/telegram';
import { confirmBooking, cancelBooking } from '@/lib/bookings/booking.service';
import { query } from '@/lib/database';
import { callAIWaterfallDirect } from '@/lib/ai/providers';
import { KUZMICH_PROMPT, type ChatMessage } from '@/lib/ai/prompts';
import {
  postRouteToChannel,
  postOperatorToChannel,
  postSezonToChannel,
} from '@/lib/notifications/telegram-channel';

export const dynamic = 'force-dynamic';

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
interface LeadRow { name: string; phone: string; route_title: string | null; created_at: string }
interface StatsRow {
  bookings_today: string; bookings_30d: string;
  leads_today: string;    leads_30d: string;
  total_users: string;    active_tours: string;
}
interface HistoryMessage { role: 'user' | 'assistant'; content: string }

// ── Утилиты ───────────────────────────────────────────────────────────────────

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function isAuthorizedOperator(chatId: number): boolean {
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
    [`tg_${tgChatId}`, JSON.stringify(messages.slice(-30))]
  ).catch(() => {});
}

// ── AI Кузьмич с историей ─────────────────────────────────────────────────────

async function kuzmichReply(userText: string, chatId: string): Promise<string> {
  const history = await getHistory(chatId);
  const messages: ChatMessage[] = [
    { role: 'system', content: KUZMICH_CHAT_SYSTEM },
    ...history.slice(-8),
    { role: 'user', content: userText },
  ];
  const reply = await callAIWaterfallDirect(messages);
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
    const res = await query<StatsRow>(`
      SELECT
        (SELECT COUNT(*)::text FROM bookings WHERE created_at >= CURRENT_DATE)             AS bookings_today,
        (SELECT COUNT(*)::text FROM bookings WHERE created_at >= NOW()-INTERVAL '30 days') AS bookings_30d,
        (SELECT COUNT(*)::text FROM leads    WHERE created_at >= CURRENT_DATE)             AS leads_today,
        (SELECT COUNT(*)::text FROM leads    WHERE created_at >= NOW()-INTERVAL '30 days') AS leads_30d,
        (SELECT COUNT(*)::text FROM users)                                                 AS total_users,
        (SELECT COUNT(*)::text FROM tours WHERE is_active = TRUE)                          AS active_tours
    `);
    const s = res.rows[0];
    const today = new Date().toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    return [
      `<b>Статистика TourHab</b>  <i>${today}</i>`,
      '',
      `📦 Брони сегодня: <b>${s.bookings_today}</b>   за 30 дней: <b>${s.bookings_30d}</b>`,
      `📋 Лиды сегодня:  <b>${s.leads_today}</b>   за 30 дней: <b>${s.leads_30d}</b>`,
      '',
      `👥 Пользователей: <b>${s.total_users}</b>`,
      `🗺 Активных туров: <b>${s.active_tours}</b>`,
    ].join('\n');
  } catch {
    return 'Не удалось загрузить статистику.';
  }
}

// ── Admin: последние лиды ─────────────────────────────────────────────────────

async function getLastLeads(): Promise<string> {
  try {
    const res = await query<LeadRow>(
      `SELECT name, phone, route_title, created_at::text
       FROM leads ORDER BY created_at DESC LIMIT 5`
    );
    if (!res.rows.length) return 'Заявок пока нет.';
    const lines = ['<b>Последние 5 заявок:</b>', ''];
    res.rows.forEach((l, i) => {
      const date = new Date(l.created_at).toLocaleString('ru-RU', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
      lines.push(`${i + 1}. <b>${esc(l.name)}</b>  <code>${esc(l.phone)}</code>`);
      if (l.route_title) lines.push(`   📍 ${esc(l.route_title)}`);
      lines.push(`   <i>${date}</i>`);
    });
    return lines.join('\n');
  } catch {
    return 'Не удалось загрузить лиды.';
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

    // /start
    if (text.startsWith('/start')) {
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
      ].join('\n'));
      return NextResponse.json({ ok: true });
    }

    // /help
    if (text.startsWith('/help')) {
      const adminBlock = admin
        ? '\n<b>Админ:</b>\n/stats — статистика\n/leads — последние заявки\n/post operator &lt;slug&gt;\n/post route &lt;uuid&gt;\n/post sezon — AI-пост в канал'
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
      const tip = await callAIWaterfallDirect([
        { role: 'system', content: KUZMICH_CHAT_SYSTEM },
        { role: 'user', content: 'Дай один конкретный практический совет туристу, который едет на Камчатку первый раз. Не общие слова — что-то реально полезное из личного опыта.' },
      ]);
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
        await sendHTML(chatId, '⏳ Генерирую сезонный пост…');
        const result = await postSezonToChannel();
        await sendHTML(chatId, result.ok ? '✅ Сезонный пост опубликован.' : `❌ Ошибка: ${result.error}`);
        return NextResponse.json({ ok: true });
      }

      if (!kind || !arg) {
        await sendHTML(chatId, [
          '<b>/post — публикация в канал</b>',
          '',
          '<code>/post operator kamchatskaya-rybalka</code>',
          '<code>/post route &lt;uuid&gt;</code>',
          '<code>/post sezon</code>  — AI генерирует пост',
        ].join('\n'));
        return NextResponse.json({ ok: true });
      }

      let result: { ok: boolean; error?: string };
      if (kind === 'operator') {
        result = await postOperatorToChannel(arg);
      } else if (kind === 'route') {
        result = await postRouteToChannel(arg);
      } else {
        await sendHTML(chatId, 'Используй: <code>operator</code>, <code>route</code> или <code>sezon</code>.');
        return NextResponse.json({ ok: true });
      }
      await sendHTML(chatId, result.ok ? '✅ Пост опубликован.' : `❌ Ошибка: ${result.error ?? 'неизвестная'}`);
      return NextResponse.json({ ok: true });
    }

    // Любой обычный текст → AI Кузьмич с историей
    if (!text.startsWith('/')) {
      const answer = await kuzmichReply(text, chatId);
      await sendHTML(chatId, answer);
      return NextResponse.json({ ok: true });
    }
  }

  // ── callback_query (кнопки Подтвердить / Отменить) ───────────────────────
  if (update.callback_query) {
    const cq             = update.callback_query;
    const senderChatId   = cq.from.id;
    const callbackChatId = String(cq.message?.chat?.id ?? senderChatId);
    const data           = cq.data ?? '';

    if (!isAuthorizedOperator(senderChatId)) {
      await telegramService.answerCallback(cq.id, 'Нет прав');
      return NextResponse.json({ ok: true });
    }

    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

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
      } catch (err) {
        await telegramService.answerCallback(cq.id, err instanceof Error ? err.message : 'Ошибка');
      }

    } else if (data.startsWith('cancel_')) {
      const match = data.match(uuidPattern);
      if (!match) { await telegramService.answerCallback(cq.id, 'Неверный формат'); return NextResponse.json({ ok: true }); }
      try {
        const { booking } = await cancelBooking(match[0], `tg:${senderChatId}`, 'operator', 'Отменено оператором через Telegram');
        await telegramService.answerCallback(cq.id, 'Отменено');
        await telegramService.sendMessage({
          chatId: callbackChatId,
          text: `<b>Бронирование отменено</b>\nТур: ${booking.tour.title}\nID: ${match[0]}`,
          parseMode: 'HTML',
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
