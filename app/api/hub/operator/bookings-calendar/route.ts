/**
 * GET /api/hub/operator/bookings-calendar?month=YYYY-MM
 * Бронирования сгруппированные по датам + доступность слотов для оператора.
 * Используется в календарном виде рабочего места.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

async function getOperatorId(userId: string): Promise<string | null> {
  const { rows } = await pool.query(
    `SELECT id FROM partners WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return rows[0]?.id ?? null;
}

export async function GET(req: NextRequest) {
  const authOrResponse = await requireOperator(req);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  const operatorId = await getOperatorId(authOrResponse.userId);
  if (!operatorId) {
    return NextResponse.json({ error: 'Оператор не найден' }, { status: 403 });
  }

  // Определяем диапазон месяца
  const monthParam = new URL(req.url).searchParams.get('month'); // YYYY-MM
  const now = new Date();
  const [year, month] = monthParam
    ? monthParam.split('-').map(Number)
    : [now.getFullYear(), now.getMonth() + 1];

  const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay  = new Date(year, month, 0).getDate();
  const dateTo   = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  // Бронирования за месяц
  const bookingsResult = await pool.query(
    `SELECT
       b.id::text,
       b.operator_tour_id::text,
       t.title  AS tour_title,
       b.tourist_name,
       b.tourist_phone,
       b.tourist_email,
       b.participants,
       b.final_price,
       b.payment_status,
       b.booking_status,
       b.special_requests,
       b.created_at,
       b.booking_date::text AS date
     FROM operator_bookings b
     JOIN operator_tours t ON b.operator_tour_id = t.id
     WHERE t.operator_id = $1
       AND b.booking_date >= $2
       AND b.booking_date <= $3
       AND b.deleted_at IS NULL
     ORDER BY b.booking_date ASC, b.created_at ASC`,
    [operatorId, dateFrom, dateTo]
  );

  // Доступность слотов за месяц
  const availResult = await pool.query(
    `SELECT
       ta.date::text,
       ta.available_slots,
       ta.booked_slots,
       ta.weather_status,
       ta.is_cancelled,
       t.title AS tour_title,
       t.id::text AS tour_id
     FROM tour_availability ta
     JOIN operator_tours t ON ta.operator_tour_id = t.id
     WHERE t.operator_id = $1
       AND ta.date >= $2
       AND ta.date <= $3
     ORDER BY ta.date ASC`,
    [operatorId, dateFrom, dateTo]
  );

  // Группировка бронирований по дате
  const byDate: Record<string, typeof bookingsResult.rows> = {};
  for (const row of bookingsResult.rows) {
    const d = row.date as string;
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(row);
  }

  // Группировка доступности по дате
  const availByDate: Record<string, typeof availResult.rows> = {};
  for (const row of availResult.rows) {
    const d = row.date as string;
    if (!availByDate[d]) availByDate[d] = [];
    availByDate[d].push(row);
  }

  // Сводка
  const total     = bookingsResult.rows.length;
  const newCount  = bookingsResult.rows.filter(r => r.booking_status === 'new').length;
  const confirmed = bookingsResult.rows.filter(r => r.booking_status === 'confirmed').length;
  const completed = bookingsResult.rows.filter(r => r.booking_status === 'completed').length;
  const cancelled = bookingsResult.rows.filter(r => r.booking_status === 'cancelled').length;
  const revenue   = bookingsResult.rows
    .filter(r => r.booking_status !== 'cancelled')
    .reduce((s, r) => s + Number(r.final_price ?? 0), 0);

  return NextResponse.json({
    success: true,
    month: `${year}-${String(month).padStart(2, '0')}`,
    bookings_by_date: byDate,
    availability_by_date: availByDate,
    summary: { total, new: newCount, confirmed, completed, cancelled, revenue },
  });
}
