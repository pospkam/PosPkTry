/**
 * Telegram уведомления по бронированиям
 *
 * Все точки ввода:
 *   1. Турист создал бронь → сообщение туристу "принято, ждём оператора"
 *   2. Оператор подтвердил → сообщение туристу "подтверждено!"
 *   3. Бронь отменена → сообщение туристу с деталями возврата
 *
 * Запускаются как fire-and-forget, не блокируют основной поток.
 */

import { telegramService } from '@/lib/notifications/telegram';
import { query } from '@/lib/database';

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

async function getTouristTelegramId(userId: string): Promise<string | null> {
  try {
    const res = await query<{ telegram_id: string }>(
      `SELECT telegram_id::text FROM users WHERE id = $1 AND telegram_id IS NOT NULL LIMIT 1`,
      [userId]
    );
    return res.rows[0]?.telegram_id ?? null;
  } catch { return null; }
}

/**
 * Турист создал бронирование — подтверждение принятия.
 */
export function notifyTouristBookingCreated(
  userId: string,
  booking: {
    id: string;
    tourTitle: string;
    date: Date;
    participants: number;
    totalAmount: number;
  }
): void {
  void (async () => {
    try {
      const chatId = await getTouristTelegramId(userId);
      if (!chatId) return;

      const dateStr = booking.date.toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'long', year: 'numeric',
      });

      await telegramService.sendMessage({
        chatId,
        text: [
          '<b>Бронирование принято!</b>',
          '',
          `<b>Тур:</b> ${esc(booking.tourTitle)}`,
          `<b>Дата:</b> ${dateStr}`,
          `<b>Участников:</b> ${booking.participants}`,
          `<b>Сумма:</b> ${booking.totalAmount.toLocaleString('ru-RU')} ₽`,
          '',
          'Оператор рассмотрит заявку в течение нескольких часов.',
          'Статус брони можно проверить в личном кабинете.',
          '',
          `<a href="https://tourhab.ru/hub/tourist/bookings">Мои бронирования →</a>`,
        ].join('\n'),
        parseMode: 'HTML',
      });
    } catch {}
  })();
}

/**
 * Оператор подтвердил бронирование — уведомление туристу.
 */
export function notifyTouristBookingConfirmed(
  userId: string,
  booking: {
    id: string;
    tourTitle: string;
    date: Date;
    participants: number;
  }
): void {
  void (async () => {
    try {
      const chatId = await getTouristTelegramId(userId);
      if (!chatId) return;

      const dateStr = booking.date.toLocaleDateString('ru-RU', {
        day: 'numeric', month: 'long', year: 'numeric',
      });

      await telegramService.sendMessage({
        chatId,
        text: [
          '<b>Оператор подтвердил бронирование!</b>',
          '',
          `<b>Тур:</b> ${esc(booking.tourTitle)}`,
          `<b>Дата:</b> ${dateStr}`,
          `<b>Участников:</b> ${booking.participants}`,
          '',
          'Подготовьтесь к поездке — оператор свяжется с вами ближе к дате.',
          '',
          `<a href="https://tourhab.ru/hub/tourist/bookings">Детали брони →</a>`,
        ].join('\n'),
        parseMode: 'HTML',
      });
    } catch {}
  })();
}

/**
 * Бронирование отменено — уведомление туристу с деталями возврата.
 */
export function notifyTouristBookingCancelled(
  userId: string,
  booking: {
    id: string;
    tourTitle: string;
    cancelledBy: 'tourist' | 'operator' | 'admin';
    refundPercent: number;
    refundAmount: number;
    refundReason: string;
  }
): void {
  void (async () => {
    try {
      const chatId = await getTouristTelegramId(userId);
      if (!chatId) return;

      const byLabel = booking.cancelledBy === 'operator'
        ? 'Оператор отменил бронирование'
        : booking.cancelledBy === 'admin'
          ? 'Бронирование отменено администратором'
          : 'Бронирование отменено';

      const refundLine = booking.refundAmount > 0
        ? `\n<b>Возврат:</b> ${booking.refundAmount.toLocaleString('ru-RU')} ₽ (${booking.refundPercent}%)`
        : '\n<b>Возврат:</b> не предусмотрен';

      await telegramService.sendMessage({
        chatId,
        text: [
          `<b>${byLabel}</b>`,
          '',
          `<b>Тур:</b> ${esc(booking.tourTitle)}`,
          refundLine,
          booking.refundReason ? `<i>${esc(booking.refundReason)}</i>` : '',
          '',
          'Если есть вопросы — напиши прямо здесь или обратись в поддержку.',
        ].filter(s => s !== '').join('\n'),
        parseMode: 'HTML',
      });
    } catch {}
  })();
}
