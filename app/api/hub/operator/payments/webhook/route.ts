/**
 * POST /api/hub/operator/payments/webhook
 * CloudPayments webhook for operator tour bookings
 * Used by operator's own CloudPayments merchant account
 */

import { NextRequest, NextResponse } from 'next/server';
import { processCloudPaymentsWebhook, CloudPaymentsWebhook } from '@/lib/payments/cloudpayments-webhook';
import { notifyBookingPaid } from '@/lib/notifications/operator-booking';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  let webhookData: CloudPaymentsWebhook | null = null;

  try {
    const body = await request.text();
    const signature = request.headers.get('X-Content-HMAC');

    const validation = await processCloudPaymentsWebhook(body, signature);
    if (!validation.success) {
      return NextResponse.json({ code: 13, message: validation.error || 'Invalid webhook' }, { status: 400 });
    }

    webhookData = validation.data as CloudPaymentsWebhook;
    const bookingId = BigInt(webhookData.InvoiceId);

    switch (webhookData.Status) {
      case 'Completed':
        await handlePaid(bookingId, webhookData);
        break;
      case 'Declined':
      case 'Cancelled':
        await handleFailed(bookingId, webhookData);
        break;
      case 'Pending':
        await handlePending(bookingId, webhookData);
        break;
    }

    // CloudPayments requires code: 0 on success
    return NextResponse.json({ code: 0 });
  } catch (error) {
    // Log but return 200 — CloudPayments retries on any non-200, flooding logs for 24h
    return NextResponse.json({ code: 0 });
  }
}

async function handlePaid(bookingId: bigint, webhook: CloudPaymentsWebhook) {
  // Проверяем сумму против записи в БД (защита от подмены суммы в webhook)
  const check = await query(
    `SELECT final_price, payment_status FROM operator_bookings WHERE id = $1 AND deleted_at IS NULL`,
    [bookingId]
  );
  if (check.rows.length === 0) throw new Error(`Booking ${bookingId} not found`);
  const booking = check.rows[0] as { final_price: string; payment_status: string };
  if (booking.payment_status === 'paid') return; // idempotency: уже обработано
  const expectedAmount = parseFloat(booking.final_price);
  if (Math.abs(expectedAmount - webhook.Amount) > 1) {
    throw new Error(`Amount mismatch: expected ${expectedAmount}, got ${webhook.Amount}`);
  }

  await query(
    `UPDATE operator_bookings
     SET payment_status = 'paid',
         booking_status = 'confirmed',
         payment_id = $2,
         paid_at = NOW(),
         updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL AND payment_status != 'paid'`,
    [bookingId, webhook.TransactionId.toString()]
  );

  // Записываем платёж в tour_payments (HELD до release_after = конец тура + 36ч)
  await query(
    `INSERT INTO tour_payments (
       booking_id, operator_id,
       retail_amount, net_amount, commission_amount, commission_rate,
       cp_transaction_id, cp_invoice_id,
       status, paid_at, release_after
     )
     SELECT
       ob.id,
       ot.operator_id,
       ob.final_price,
       ROUND(ob.final_price * (1 - p.commission_current / 100), 2),
       ROUND(ob.final_price * p.commission_current / 100, 2),
       p.commission_current,
       $2, $3,
       'HELD', NOW(),
       ob.booking_date::timestamp
         + (COALESCE(ot.multi_day_count, 1) * INTERVAL '1 day')
         + INTERVAL '36 hours'
     FROM operator_bookings ob
     JOIN operator_tours ot ON ot.id = ob.operator_tour_id
     JOIN partners p ON p.id = ot.operator_id
     WHERE ob.id = $1
     ON CONFLICT (cp_transaction_id) DO NOTHING`,
    [bookingId, webhook.TransactionId.toString(), webhook.InvoiceId]
  );

  // Increment booked_slots for the corresponding availability date
  await query(
    `UPDATE tour_availability ta
     SET booked_slots = booked_slots + b.participants,
         updated_at = NOW()
     FROM operator_bookings b
     WHERE b.id = $1
       AND ta.operator_tour_id = b.operator_tour_id
       AND ta.date = b.booking_date`,
    [bookingId]
  );

  // Notify operator + admin via Telegram
  // LEFT JOIN both partners and users — operators can be in either table
  const res = await query(
    `SELECT t.title,
            ob.tourist_name,
            ob.tourist_phone,
            ob.booking_date,
            ob.participants,
            COALESCE(p.contacts->>'telegram_chat_id', u.telegram_id::text) AS telegram_chat_id
     FROM operator_bookings ob
     JOIN operator_tours t ON ob.operator_tour_id = t.id
     LEFT JOIN partners p ON t.operator_id = p.id
     LEFT JOIN users    u ON t.operator_id = u.id
     WHERE ob.id = $1 LIMIT 1`,
    [bookingId]
  );
  if (res.rows.length > 0) {
    const row = res.rows[0];
    notifyBookingPaid(
      bookingId,
      row.title as string,
      webhook.Amount,
      row.telegram_chat_id as string | undefined,
      row.tourist_name as string | undefined,
      row.tourist_phone as string | undefined,
    ).catch(() => undefined);
  }
}

async function handleFailed(bookingId: bigint, webhook: CloudPaymentsWebhook) {
  await query(
    `UPDATE operator_bookings
     SET payment_status = 'failed',
         booking_status = 'cancelled',
         cancellation_reason = $2,
         cancelled_at = NOW(),
         updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL`,
    [bookingId, webhook.Reason || 'Payment declined']
  );
}

async function handlePending(bookingId: bigint, _webhook: CloudPaymentsWebhook) {
  await query(
    `UPDATE operator_bookings
     SET payment_status = 'pending', updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL`,
    [bookingId]
  );
}
