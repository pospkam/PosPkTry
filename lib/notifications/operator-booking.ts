/**
 * Telegram notifications for operator booking events
 * Sends to: TELEGRAM_CHAT_ID (admin), operator's own chat if configured
 */

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

  // Always notify admin
  const adminChatId = process.env.TELEGRAM_CHAT_ID;
  if (adminChatId) {
    await tgSend(adminChatId, text);
  }

  // Notify operator if they have a chat_id configured
  if (payload.operator_telegram_chat_id) {
    await tgSend(payload.operator_telegram_chat_id, text);
  }
}

export async function notifyBookingPaid(
  bookingId: bigint | string,
  tourTitle: string,
  amount: number,
  operatorTelegramChatId?: string
): Promise<void> {
  const text = [
    `<b>Оплата получена #${bookingId}</b>`,
    `Тур: ${esc(tourTitle)}`,
    `Сумма: ${amount.toLocaleString('ru-RU')} ₽`,
  ].join('\n');

  const adminChatId = process.env.TELEGRAM_CHAT_ID;
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
