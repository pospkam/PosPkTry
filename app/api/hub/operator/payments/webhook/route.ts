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
    console.error('[OPERATOR WEBHOOK] Unhandled error:', webhookData?.InvoiceId, error);
    return NextResponse.json({ code: 0 });
  }
}

async function handlePaid(bookingId: bigint, webhook: CloudPaymentsWebhook) {
  await query(
    `UPDATE operator_bookings
     SET payment_status = 'paid',
         booking_status = 'confirmed',
         payment_id = $2,
         paid_at = NOW(),
         updated_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL`,
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
  const res = await query(
    `SELECT t.title, p.name as operator_name,
            p.contacts->>'telegram_chat_id' as telegram_chat_id
     FROM operator_bookings b
     JOIN operator_tours t ON b.operator_tour_id = t.id
     JOIN partners p ON t.operator_id = p.id
     WHERE b.id = $1 LIMIT 1`,
    [bookingId]
  );
  if (res.rows.length > 0) {
    const row = res.rows[0];
    notifyBookingPaid(
      bookingId,
      row.title as string,
      webhook.Amount,
      row.telegram_chat_id as string | undefined
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
