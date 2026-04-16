/**
 * Notifications for operator booking events.
 * Sends to: Telegram (admin + operator) AND MAX (operator, если подключён).
 * MAX — работает без VPN в РФ, приоритет для операторов.
 */

import { maxSendDm } from '@/lib/notifications/max-channel';

async function tgSend(chatId: string, text: string): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token || !chatId) return;
  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
  } catch {
    // Non-fatal: telegram failure must not break booking flow
  }
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export interface BookingNotifyPayload {
  booking_id: bigint | string;
  tour_title: string;
  tourist_name?: string;
  tourist_phone?: string;
  tourist_email?: string;
  booking_date: string;
  participants: number;
  final_price?: number;
  operator_name: string;
  operator_telegram_chat_id?: string;
  operator_max_chat_id?: string | number | null;
  via?: string; // 'website' | 'direct_contact' | 'api'
}

export async function notifyNewBooking(payload: BookingNotifyPayload): Promise<void> {
  const priceStr = payload.final_price
    ? `${payload.final_price.toLocaleString('ru-RU')} ₽`
    : 'не указана';

  const viaLabel: Record<string, string> = {
    website: 'Сайт',
    direct_contact: 'Телефон/мессенджер',
    api: 'API',
  };

  const text = [
    `<b>Новая бронь #${payload.booking_id}</b>`,
    `Тур: ${esc(payload.tour_title)}`,
    `Оператор: ${esc(payload.operator_name)}`,
    `Дата: ${payload.booking_date}`,
    `Участников: ${payload.participants}`,
    payload.tourist_name ? `Турист: ${esc(payload.tourist_name)}` : null,
    payload.tourist_phone ? `Телефон: ${esc(payload.tourist_phone)}` : null,
    payload.tourist_email ? `Email: ${esc(payload.tourist_email)}` : null,
    `Цена: ${priceStr}`,
    payload.via ? `Источник: ${viaLabel[payload.via] ?? payload.via}` : null,
  ]
    .filter(Boolean)
    .join('\n');

  // Всегда уведомляем админа в Telegram
  const adminChatId = process.env.TELEGRAM_CHAT_ID;
  if (adminChatId) await tgSend(adminChatId, text);

  // Оператор: Telegram (если настроен)
  if (payload.operator_telegram_chat_id) {
    await tgSend(payload.operator_telegram_chat_id, text);
  }

  // Оператор: MAX (работает без VPN — приоритетный канал)
  if (payload.operator_max_chat_id) {
    await maxSendDm(payload.operator_max_chat_id, text).catch(() => {});
  }
}

export async function notifyBookingPaid(
  bookingId: bigint | string,
  tourTitle: string,
  amount: number,
  operatorTelegramChatId?: string,
  touristName?: string,
  touristPhone?: string,
): Promise<void> {
  const lines = [
    `<b>Оплата получена — бронь #${bookingId}</b>`,
    `Тур: ${esc(tourTitle)}`,
    `Сумма: ${amount.toLocaleString('ru-RU')} ₽`,
  ];
  if (touristName)  lines.push(`Турист: ${esc(touristName)}`);
  if (touristPhone) lines.push(`Телефон: ${esc(touristPhone)}`);
  lines.push(`<a href="https://tourhab.ru/hub/operator/bookings/${bookingId}">Открыть бронь</a>`);

  const text = lines.join('\n');

  const adminChatId = process.env.TELEGRAM_OWNER_ID ?? process.env.TELEGRAM_CHAT_ID;
  if (adminChatId) await tgSend(adminChatId, text);
  if (operatorTelegramChatId) await tgSend(operatorTelegramChatId, text);
}

export async function notifyWeatherAlert(
  tourId: bigint | string,
  tourTitle: string,
  issues: string[],
  bookingsCount: number,
  operatorTelegramChatId?: string
): Promise<void> {
  const text = [
    `<b>Погодный алерт — тур #${tourId}</b>`,
    `${esc(tourTitle)}`,
    `Проблемы:`,
    ...issues.map(i => `- ${esc(i)}`),
    `Бронь на дату: ${bookingsCount} чел.`,
    `Требуется решение: отмена / замена маршрута`,
  ].join('\n');

  const adminChatId = process.env.TELEGRAM_CHAT_ID;
  if (adminChatId) await tgSend(adminChatId, text);
  if (operatorTelegramChatId) await tgSend(operatorTelegramChatId, text);
}
