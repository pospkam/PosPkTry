/**
 * POST /api/telegram/webhook
 *
 * Обработчик @KuzmichKam_bot.
 *
 * Команды (публичные):
 *   /start  — приветствие от Кузьмича
 *   /help   — список команд
 *   /route  — случайный маршрут из каталога
 *   /sezon  — AI-совет на текущий сезон
 *   <текст> — AI-ответ в голосе Кузьмича
 *
 * Кнопки оператора (callback_query):
 *   confirm_UUID — подтвердить бронирование
 *   cancel_UUID  — отменить бронирование
 *
 * Безопасность: X-Telegram-Bot-Api-Secret-Token
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { telegramService } from '@/lib/notifications/telegram';
import { confirmBooking, cancelBooking } from '@/lib/bookings/booking.service';
import { query } from '@/lib/database';
import { callAIWaterfall } from '@/lib/ai/providers';
import { KUZMICH_PROMPT, type ChatMessage } from '@/lib/ai/prompts';

export const dynamic = 'force-dynamic';

// Kuzmich в режиме диалога (не пост-режим)
const KUZMICH_CHAT_SYSTEM =
  KUZMICH_PROMPT +
  '\n\nРЕЖИМ: Telegram-чат, не публикация. Ответ 70-120 слов.' +
  ' HTML-теги для Telegram: <b>жирный</b>, <i>курсив</i>. Без markdown-звёздочек и заголовков секций.';

// ── Zod-схемы ────────────────────────────────────────────────────────────────
const TelegramUserSchema = z.object({
  id: z.number(),
  username: z.string().optional(),
  first_name: z.string().optional(),
});

const TelegramChatSchema = z.object({
  id: z.number(),
  type: z.string().optional(),
});

const TelegramMessageSchema = z.object({
  message_id: z.number().optional(),
  from: TelegramUserSchema.optional(),
  chat: TelegramChatSchema.optional(),
  text: z.string().optional(),
});

const TelegramCallbackQuerySchema = z.object({
  id: z.string(),
  from: TelegramUserSchema,
  message: z.object({
    chat: TelegramChatSchema.optional(),
  }).optional(),
  data: z.string().optional(),
});

const TelegramUpdateSchema = z.object({
  update_id: z.number(),
  message: TelegramMessageSchema.optional(),
  callback_query: TelegramCallbackQuerySchema.optional(),
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
    from: { id: number; username?: string; first_name?: string };
    message?: { chat: { id: number } };
    data?: string;
  };
}

interface RouteRow {
  id: string;
  title: string;
  category: string;
  description: string | null;
}

// ── Проверка оператора ────────────────────────────────────────────────────────
function isAuthorizedOperator(chatId: number): boolean {
  const fishingId = process.env.TELEGRAM_FISHING_CHAT_ID;
  if (!fishingId) return false;
  const ids = fishingId.split(',').map(s => s.trim()).filter(Boolean);
  return ids.includes(String(chatId));
}

// ── Случайный видимый маршрут ─────────────────────────────────────────────────
async function getRandomRoute(): Promise<RouteRow | null> {
  try {
    const result = await query<RouteRow>(
      `SELECT id::text, title, category, description
       FROM agent_route_knowledge
       WHERE is_visible = TRUE
       ORDER BY RANDOM()
       LIMIT 1`
    );
    return result.rows[0] ?? null;
  } catch {
    return null;
  }
}

// ── AI-ответ в голосе Кузьмича ────────────────────────────────────────────────
async function kuzmichReply(userText: string): Promise<string> {
  const messages: ChatMessage[] = [
    { role: 'system', content: KUZMICH_CHAT_SYSTEM },
    { role: 'user', content: userText },
  ];
  return callAIWaterfall(messages);
}

// ── Хелпер отправки HTML-сообщения ───────────────────────────────────────────
async function sendHTML(chatId: string, text: string): Promise<void> {
  await telegramService.sendMessage({ chatId, text, parseMode: 'HTML' });
}

// ── Основной обработчик ───────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  // Проверяем секретный токен
  const secret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  let update: TelegramUpdate;
  try {
    const json = await request.json();
    const parsed = TelegramUpdateSchema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    update = parsed.data as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // ── Текстовые сообщения ───────────────────────────────────────────────────
  if (update.message?.text && update.message.chat) {
    const chatId = String(update.message.chat.id);
    const text = update.message.text.trim();

    // /start
    if (text.startsWith('/start')) {
      await sendHTML(chatId, [
        '<b>Привет! Я — Кузьмич.</b>',
        '',
        'Камчадал в третьем поколении, прошёл больше 300 маршрутов. Знаю Камчатку как свои пять пальцев — вулканы, медведи, рыбалка, термалки.',
        '',
        '<b>Что умею:</b>',
        '/route — кину маршрут',
        '/sezon — что актуально прямо сейчас',
        '/help — полный список',
        '',
        'Или просто спроси — про вулканы, рыбалку, когда лучше ехать. Отвечу честно.',
      ].join('\n'));
      return NextResponse.json({ ok: true });
    }

    // /help
    if (text.startsWith('/help')) {
      await sendHTML(chatId, [
        '<b>Команды:</b>',
        '',
        '/route — случайный маршрут из каталога',
        '/sezon — совет по текущему сезону',
        '/start — начать заново',
        '',
        'Или задай вопрос текстом — про маршруты, снаряжение, медведей. Отвечу как есть.',
        '',
        'Все маршруты: <a href="https://tourhab.ru/routes">tourhab.ru/routes</a>',
      ].join('\n'));
      return NextResponse.json({ ok: true });
    }

    // /route
    if (text.startsWith('/route')) {
      const route = await getRandomRoute();
      if (!route) {
        await sendHTML(
          chatId,
          'Пока маршруты загружаются. Загляни сам: <a href="https://tourhab.ru/routes">tourhab.ru/routes</a>'
        );
      } else {
        const desc = route.description
          ? route.description.slice(0, 220).trimEnd() + '…'
          : '';
        await sendHTML(chatId, [
          `<b>${route.title}</b>`,
          '',
          desc,
          '',
          `<a href="https://tourhab.ru/routes/${route.id}">Подробнее на TourHab</a>`,
        ].filter(Boolean).join('\n'));
      }
      return NextResponse.json({ ok: true });
    }

    // /sezon
    if (text.startsWith('/sezon')) {
      const month = new Date().toLocaleString('ru-RU', { month: 'long' });
      const answer = await kuzmichReply(
        `Сейчас ${month}. Один конкретный совет: что стоит делать туристу на Камчатке прямо сейчас?`
      );
      await sendHTML(chatId, answer);
      return NextResponse.json({ ok: true });
    }

    // Любой обычный текст → AI Кузьмич
    if (!text.startsWith('/')) {
      const answer = await kuzmichReply(text);
      await sendHTML(chatId, answer);
      return NextResponse.json({ ok: true });
    }
  }

  // ── callback_query (кнопки Подтвердить / Отменить) ───────────────────────
  if (update.callback_query) {
    const cq = update.callback_query;
    const senderChatId = cq.from.id;
    const callbackChatId = String(cq.message?.chat?.id ?? senderChatId);
    const data = cq.data ?? '';

    if (!isAuthorizedOperator(senderChatId)) {
      await telegramService.answerCallback(cq.id, 'Нет прав');
      return NextResponse.json({ ok: true });
    }

    const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

    if (data.startsWith('confirm_')) {
      const match = data.match(uuidPattern);
      if (!match) {
        await telegramService.answerCallback(cq.id, 'Неверный формат');
        return NextResponse.json({ ok: true });
      }
      const bookingId = match[0];
      try {
        const booking = await confirmBooking(bookingId, `tg:${senderChatId}`);
        await telegramService.answerCallback(cq.id, 'Подтверждено!');
        await telegramService.sendMessage({
          chatId: callbackChatId,
          text: [
            `<b>Бронирование подтверждено</b>`,
            `Тур: ${booking.tour.title}`,
            `Дата: ${booking.date.toLocaleDateString('ru-RU')}`,
            `Участников: ${booking.participants}`,
            `ID: ${bookingId}`,
          ].join('\n'),
          parseMode: 'HTML',
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Ошибка';
        await telegramService.answerCallback(cq.id, msg);
      }

    } else if (data.startsWith('cancel_')) {
      const match = data.match(uuidPattern);
      if (!match) {
        await telegramService.answerCallback(cq.id, 'Неверный формат');
        return NextResponse.json({ ok: true });
      }
      const bookingId = match[0];
      try {
        const { booking } = await cancelBooking(
          bookingId,
          `tg:${senderChatId}`,
          'operator',
          'Отменено оператором через Telegram'
        );
        await telegramService.answerCallback(cq.id, 'Отменено');
        await telegramService.sendMessage({
          chatId: callbackChatId,
          text: [
            `<b>Бронирование отменено</b>`,
            `Тур: ${booking.tour.title}`,
            `ID: ${bookingId}`,
          ].join('\n'),
          parseMode: 'HTML',
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Ошибка';
        await telegramService.answerCallback(cq.id, msg);
      }

    } else {
      await telegramService.answerCallback(cq.id);
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
