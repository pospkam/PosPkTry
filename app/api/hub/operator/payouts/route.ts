/**
 * GET   /api/hub/operator/payouts — платежи и выплаты оператора
 * PATCH /api/hub/operator/payouts — сохранить реквизиты для выплат
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth/middleware';
import { query } from '@/lib/database';
import { z } from 'zod';

const PayoutDetailsSchema = z.discriminatedUnion('method', [
  z.object({
    method: z.literal('sbp'),
    phone: z.string().regex(/^\+7\d{10}$/, 'Формат: +7XXXXXXXXXX'),
  }),
  z.object({
    method: z.literal('card'),
    token: z.string().min(1),
  }),
  z.object({
    method: z.literal('bank'),
    inn:     z.string().regex(/^\d{10,12}$/, 'ИНН: 10 или 12 цифр'),
    bik:     z.string().regex(/^\d{9}$/, 'БИК: 9 цифр'),
    account: z.string().regex(/^\d{20}$/, 'Счёт: 20 цифр'),
    name:    z.string().min(3).max(255),
    kpp:     z.string().regex(/^\d{9}$/).optional(),
  }),
]);

export const dynamic = 'force-dynamic';

async function getOperatorId(userId: string): Promise<string | null> {
  const r = await query(`SELECT id FROM partners WHERE user_id = $1 LIMIT 1`, [userId]);
  return (r.rows[0]?.id as string) || null;
}

export async function GET(request: NextRequest) {
  const authOrResponse = await requireOperator(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  const operatorId = await getOperatorId(authOrResponse.userId);
  if (!operatorId) {
    return NextResponse.json({ error: 'Оператор не найден' }, { status: 403 });
  }

  // Сводка: баланс к выплате, удержано, выплачено всего
  const summaryResult = await query(
    `SELECT
       COALESCE(SUM(net_amount) FILTER (WHERE status = 'HELD'),    0) AS balance_held,
       COALESCE(SUM(net_amount) FILTER (WHERE status = 'RELEASED'), 0) AS total_released,
       COALESCE(SUM(commission_amount), 0)                            AS total_commission,
       COUNT(*) FILTER (WHERE status = 'HELD')                        AS held_count,
       COUNT(*) FILTER (WHERE status = 'RELEASED')                    AS released_count
     FROM tour_payments
     WHERE operator_id = $1`,
    [operatorId]
  );

  // Текущая комиссия
  const partnerResult = await query(
    `SELECT commission_current, payout_method, payout_verified FROM partners WHERE id = $1`,
    [operatorId]
  );

  // Последние 50 платежей
  const paymentsResult = await query(
    `SELECT
       tp.id, tp.retail_amount, tp.net_amount, tp.commission_amount,
       tp.commission_rate, tp.status, tp.paid_at, tp.release_after,
       tp.released_at, tp.refunded_at,
       ot.title AS tour_title,
       ob.booking_date, ob.participants,
       ob.tourist_name
     FROM tour_payments tp
     JOIN operator_bookings ob ON ob.id = tp.booking_id
     JOIN operator_tours ot ON ot.id = ob.operator_tour_id
     WHERE tp.operator_id = $1
     ORDER BY tp.paid_at DESC
     LIMIT 50`,
    [operatorId]
  );

  // История выплат (operator_payouts)
  const payoutsResult = await query(
    `SELECT id, total_net, booking_count, status, period_start, period_end,
            paid_at, payment_reference, failure_reason
     FROM operator_payouts
     WHERE operator_id = $1
     ORDER BY created_at DESC
     LIMIT 20`,
    [operatorId]
  );

  const s = summaryResult.rows[0];
  const p = partnerResult.rows[0];

  return NextResponse.json({
    success: true,
    data: {
      summary: {
        balanceHeld:     parseFloat(s.balance_held    as string),
        totalReleased:   parseFloat(s.total_released  as string),
        totalCommission: parseFloat(s.total_commission as string),
        heldCount:       parseInt(s.held_count    as string, 10),
        releasedCount:   parseInt(s.released_count as string, 10),
      },
      commissionCurrent: parseFloat(p?.commission_current as string ?? '15'),
      payoutMethod:      p?.payout_method as string | null,
      payoutVerified:    p?.payout_verified as boolean ?? false,
      payments: paymentsResult.rows,
      payouts:  payoutsResult.rows,
    },
  });
}

export async function PATCH(request: NextRequest) {
  const authOrResponse = await requireOperator(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  const operatorId = await getOperatorId(authOrResponse.userId);
  if (!operatorId) return NextResponse.json({ error: 'Оператор не найден' }, { status: 403 });

  const body: unknown = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Неверный JSON' }, { status: 400 });

  const parsed = PayoutDetailsSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Ошибка валидации', details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  const { method, ...details } = parsed.data;

  await query(
    `UPDATE partners
     SET payout_method  = $1,
         payout_details = $2,
         payout_verified = FALSE,
         updated_at = NOW()
     WHERE id = $3`,
    [method, JSON.stringify(details), operatorId]
  );

  return NextResponse.json({ success: true, message: 'Реквизиты сохранены. Верификация пройдёт в течение 1 рабочего дня.' });
}
