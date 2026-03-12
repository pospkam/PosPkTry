/**
 * POST /api/telegram/webhook
 *
 * Обработчик callback-запросов от Telegram-бота @KuzmichKam_bot.
 *
 * Поддержка:
 *   - /start (message) → ответить своим chat_id (для настройки TELEGRAM_FISHING_CHAT_ID)
 *   - callback_data: confirm_BOOKING_UUID → подтвердить бронирование, обновить booked_slots
 *   - callback_data: cancel_BOOKING_UUID  → отменить бронирование
 *
 * Безопасность:
 *   - Проверяем заголовок X-Telegram-Bot-Api-Secret-Token = TELEGRAM_WEBHOOK_SECRET
 *   - Для confirm/cancel: проверяем chat_id через TELEGRAM_FISHING_CHAT_ID
 *     (или любой авторизованный chat_id в TELEGRAM_OPERATOR_CHAT_IDS — через запятую)
 */

import { NextRequest, NextResponse } from 'next/server';
import { telegramService } from '@/lib/notifications/telegram';
import { confirmBooking, cancelBooking } from '@/lib/bookings/booking.service';

export const dynamic = 'force-dynamic';

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

function isAuthorizedOperator(chatId: number): boolean {
  const fishingId = process.env.TELEGRAM_FISHING_CHAT_ID;
  if (!fishingId) return false;

  // TELEGRAM_FISHING_CHAT_ID может быть списком через запятую
  const ids = fishingId.split(',').map(s => s.trim()).filter(Boolean);
  return ids.includes(String(chatId));
}

export async function POST(request: NextRequest) {
  // Проверяем секретный токен webhook
  const secret = request.headers.get('X-Telegram-Bot-Api-Secret-Token');
  const expectedSecret = process.env.TELEGRAM_WEBHOOK_SECRET;
  if (expectedSecret && secret !== expectedSecret) {
    return NextResponse.json({ ok: false }, { status: 403 });
  }

  let update: TelegramUpdate;
  try {
    update = await request.json() as TelegramUpdate;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }

  // ── /start сообщение — ответить chat_id ──────────────────────────────────
  if (update.message?.text?.startsWith('/start')) {
    const chatId = String(update.message.chat.id);
    const name = update.message.from.first_name ?? 'Unknown';
    await telegramService.sendMessage({
      chatId,
      text: [
        '👋 Привет, ' + name + '!',
        '',
        `Твой chat_id: <code>${chatId}</code>`,
        '',
        'Передай этот ID администратору для настройки уведомлений о бронированиях.',
      ].join('\n'),
      parseMode: 'HTML',
    });
    return NextResponse.json({ ok: true });
  }

  // ── callback_query (кнопки Подтвердить / Отменить) ───────────────────────
  if (update.callback_query) {
    const cq = update.callback_query;
    const senderChatId = cq.from.id;
    const callbackChatId = String(cq.message?.chat.id ?? senderChatId);
    const data = cq.data ?? '';

    // Авторизация: только зарегистрированный оператор
    if (!isAuthorizedOperator(senderChatId)) {
      await telegramService.answerCallback(cq.id, '⛔ Нет прав');
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
        await telegramService.answerCallback(cq.id, '✅ Подтверждено!');
        await telegramService.sendMessage({
          chatId: callbackChatId,
          text: [
            `✅ <b>Бронирование подтверждено</b>`,
            `Тур: ${booking.tour.title}`,
            `Дата: ${booking.date.toLocaleDateString('ru-RU')}`,
            `Участников: ${booking.participants}`,
            `🆔 ${bookingId}`,
          ].join('\n'),
          parseMode: 'HTML',
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Ошибка';
        await telegramService.answerCallback(cq.id, `⚠️ ${msg}`);
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
        await telegramService.answerCallback(cq.id, '❌ Отменено');
        await telegramService.sendMessage({
          chatId: callbackChatId,
          text: [
            `❌ <b>Бронирование отменено</b>`,
            `Тур: ${booking.tour.title}`,
            `🆔 ${bookingId}`,
          ].join('\n'),
          parseMode: 'HTML',
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Ошибка';
        await telegramService.answerCallback(cq.id, `⚠️ ${msg}`);
      }

    } else {
      await telegramService.answerCallback(cq.id);
    }

    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true });
}
