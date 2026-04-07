/**
 * POST /api/payments/tochka/webhook
 * Точка Bank вызывает этот endpoint при успешной оплате по QR.
 *
 * Настройка вебхука: ЛК Точки → Интеграции → Уведомления →
 *   URL: https://tourhab.ru/api/payments/tochka/webhook
 *   События: payment.completed
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

interface TochkaWebhookPayload {
  event:    string;           // "payment.completed"
  qrcId:    string;           // ID QR-кода = tochka_qr_id в нашей БД
  amount:   number;           // в копейках
  currency: string;
  transactionDate: string;
  order?:   string;           // booking_id который мы передавали при создании QR
}

export async function POST(req: NextRequest) {
  try {
    const payload = await req.json() as TochkaWebhookPayload;

    if (payload.event !== 'payment.completed') {
      return NextResponse.json({ ok: true }); // игнорируем другие события
    }

    const qrId = payload.qrcId;
    if (!qrId) return NextResponse.json({ ok: true });

    // Находим бронирование по qrId
    const { rows } = await pool.query<{ id: number; final_price: number; tourist_name: string }>(
      `SELECT id, final_price, tourist_name
       FROM operator_bookings
       WHERE tochka_qr_id = $1 AND booking_status = 'pending_payment'
       LIMIT 1`,
      [qrId],
    );

    if (!rows[0]) {
      // Уже обработано или не найдено — возвращаем 200 чтобы Точка не повторяла
      return NextResponse.json({ ok: true });
    }

    const booking = rows[0];
    const paidAmount = payload.amount / 100; // копейки → рубли

    // Подтверждаем бронирование
    await pool.query(
      `UPDATE operator_bookings
       SET booking_status = 'confirmed',
           paid_at = $1,
           paid_amount = $2,
           updated_at = NOW()
       WHERE id = $3`,
      [new Date(payload.transactionDate), paidAmount, booking.id],
    );

    // Пишем в лог AI-действий для аналитики
    await pool.query(
      `INSERT INTO ai_actions_log (action_type, provider, metadata, created_at)
       VALUES ('payment_confirmed', 'tochka_sbp', $1, NOW())`,
      [JSON.stringify({ bookingId: booking.id, amount: paidAmount, qrId })],
    ).catch(() => {});

    // Уведомление оператору через Telegram (fire-and-forget)
    notifyOperator(booking.id, booking.tourist_name, paidAmount).catch(() => {});

    return NextResponse.json({ ok: true });

  } catch {
    // Всегда 200 — иначе Точка будет повторять вебхук
    return NextResponse.json({ ok: true });
  }
}

async function notifyOperator(bookingId: number, touristName: string, amount: number) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const ownerId = process.env.TELEGRAM_OWNER_ID;
  if (!token || !ownerId) return;

  const text = [
    'Оплата получена через СБП',
    '',
    `Бронирование: #${bookingId}`,
    `Турист: ${touristName}`,
    `Сумма: ${amount.toLocaleString('ru-RU')} р.`,
    '',
    `tourhab.ru/hub/operator/bookings`,
  ].join('\n');

  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: ownerId, text, parse_mode: 'HTML' }),
  });
}
