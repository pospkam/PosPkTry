/**
 * lib/notifications/booking-notifications.ts
 *
 * Уведомления туристам о событиях бронирования.
 * Вызывается из booking.service.ts — fire-and-forget, не блокирует транзакцию.
 *
 * Каналы:
 *  1. Telegram (если у туриста есть telegram_id)
 *  2. Email (всегда, если есть email)
 */

import { telegramService } from './telegram';
import { emailService } from './email-service';
import { pool } from '@/lib/db-pool';

interface TouristContact {
  name: string;
  email: string | null;
  telegramId: string | null;
}

interface BookingInfo {
  id: string;
  tourName: string;
  date: string;
  participants: number;
  totalPrice: number;
  refundAmount?: number;
  refundPercent?: number;
  refundReason?: string;
}

async function getTouristContact(userId: string): Promise<TouristContact | null> {
  try {
    const res = await pool.query<{ name: string; email: string | null; telegram_id: string | null }>(
      `SELECT name, email, telegram_id::text FROM users WHERE id = $1`,
      [userId]
    );
    if (!res.rows[0]) return null;
    return {
      name: res.rows[0].name,
      email: res.rows[0].email,
      telegramId: res.rows[0].telegram_id,
    };
  } catch {
    return null;
  }
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ── Подтверждение бронирования ────────────────────────────────────

export async function notifyBookingConfirmed(
  userId: string,
  booking: BookingInfo,
): Promise<void> {
  const contact = await getTouristContact(userId);
  if (!contact) return;

  const firstName = contact.name.split(' ')[0];
  const dateFormatted = new Date(booking.date + 'T00:00:00').toLocaleDateString('ru-RU', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  // Telegram
  if (contact.telegramId) {
    void telegramService.sendMessage({
      chatId: contact.telegramId,
      text: [
        `<b>${firstName}, бронирование подтверждено!</b>`,
        '',
        `<b>${esc(booking.tourName)}</b>`,
        `Дата: <b>${dateFormatted}</b>`,
        `Участников: ${booking.participants}`,
        `Сумма: <b>${booking.totalPrice.toLocaleString('ru-RU')} ₽</b>`,
        '',
        `<a href="https://tourhab.ru/hub/tourist/bookings">Детали бронирования →</a>`,
      ].join('\n'),
      parseMode: 'HTML',
    }).catch(() => {});
  }

  // Email
  if (contact.email) {
    void emailService.sendBookingConfirmation({
      bookingId: booking.id,
      touristName: contact.name,
      touristEmail: contact.email,
      tourTitle: booking.tourName,
      date: new Date(booking.date + 'T00:00:00'),
      participants: booking.participants,
      totalAmount: booking.totalPrice,
    }).catch(() => {});
  }
}

// ── Отмена + возврат ──────────────────────────────────────────────

export async function notifyBookingCancelled(
  userId: string,
  booking: BookingInfo,
): Promise<void> {
  const contact = await getTouristContact(userId);
  if (!contact) return;

  const firstName = contact.name.split(' ')[0];
  const hasRefund = (booking.refundAmount ?? 0) > 0;

  // Telegram
  if (contact.telegramId) {
    const lines = [
      `<b>${firstName}, бронирование отменено.</b>`,
      '',
      `<b>${esc(booking.tourName)}</b>`,
    ];
    if (hasRefund) {
      lines.push(
        '',
        `Возврат: <b>${(booking.refundAmount ?? 0).toLocaleString('ru-RU')} ₽</b> (${booking.refundPercent ?? 0}%)`,
        booking.refundReason ? `<i>${esc(booking.refundReason)}</i>` : '',
        '',
        'Средства поступят на карту в течение 3-5 рабочих дней.',
      );
    } else {
      lines.push('', 'Возврат не предусмотрен согласно условиям отмены.');
    }
    lines.push('', `<a href="https://tourhab.ru/hub/tourist/bookings">История бронирований →</a>`);

    void telegramService.sendMessage({
      chatId: contact.telegramId,
      text: lines.filter(Boolean).join('\n'),
      parseMode: 'HTML',
    }).catch(() => {});
  }

  // Email
  if (contact.email) {
    void emailService.sendBookingCancellation({
      bookingId: booking.id,
      touristName: contact.name,
      touristEmail: contact.email,
      tourTitle: booking.tourName,
      refundAmount: booking.refundAmount ?? 0,
      refundPercent: booking.refundPercent ?? 0,
      refundReason: booking.refundReason,
    }).catch(() => {});
  }
}
