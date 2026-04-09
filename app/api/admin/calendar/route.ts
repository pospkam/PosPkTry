/**
 * GET /api/admin/calendar?month=YYYY-MM
 *
 * Платформенный календарь для admin-панели.
 * Возвращает по каждому дню месяца:
 *   - кол-во бронирований (total / new / confirmed / cancelled / completed)
 *   - выручка
 *   - активные операторы и туры
 *   - коэффициент отмен (для аномалий)
 *   - топ-5 туров месяца
 *   - сводка за месяц
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { requireAdmin } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

interface DayRow {
  date: string;
  total_bookings: string;
  new_bookings: string;
  confirmed_bookings: string;
  cancelled_bookings: string;
  completed_bookings: string;
  revenue: string;
  active_operators: string;
  active_tours: string;
  booked_participants: string;
  cancellation_rate: string | null;
}

interface TopTourRow {
  tour_title: string;
  operator_name: string;
  bookings: string;
  revenue: string;
}

interface PrevMonthRow {
  revenue: string;
  total_bookings: string;
}

export async function GET(request: NextRequest) {
  const authOrResponse = await requireAdmin(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get('month');
  const now = new Date();
  const [year, month] = monthParam
    ? monthParam.split('-').map(Number)
    : [now.getFullYear(), now.getMonth() + 1];

  const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay  = new Date(year, month, 0).getDate();
  const dateTo   = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  // Предыдущий месяц для сравнения
  const prevDate    = new Date(year, month - 2, 1);
  const prevYear    = prevDate.getFullYear();
  const prevMonth   = prevDate.getMonth() + 1;
  const prevFrom    = `${prevYear}-${String(prevMonth).padStart(2, '0')}-01`;
  const prevLastDay = new Date(prevYear, prevMonth, 0).getDate();
  const prevTo      = `${prevYear}-${String(prevMonth).padStart(2, '0')}-${prevLastDay}`;

  try {
    const [daysResult, topToursResult, prevResult] = await Promise.all([

      // ── Посуточная статистика ────────────────────────────────────────────
      pool.query<DayRow>(
        `SELECT
           b.booking_date::text                                                AS date,
           COUNT(b.id)::text                                                   AS total_bookings,
           COUNT(b.id) FILTER (WHERE b.booking_status = 'new')::text           AS new_bookings,
           COUNT(b.id) FILTER (WHERE b.booking_status = 'confirmed')::text     AS confirmed_bookings,
           COUNT(b.id) FILTER (WHERE b.booking_status = 'cancelled')::text     AS cancelled_bookings,
           COUNT(b.id) FILTER (WHERE b.booking_status = 'completed')::text     AS completed_bookings,
           COALESCE(
             SUM(b.final_price) FILTER (WHERE b.booking_status NOT IN ('cancelled')), 0
           )::text                                                              AS revenue,
           COUNT(DISTINCT t.operator_id)::text                                 AS active_operators,
           COUNT(DISTINCT b.operator_tour_id)::text                            AS active_tours,
           COALESCE(
             SUM(b.participants) FILTER (WHERE b.booking_status IN ('new','confirmed')), 0
           )::text                                                              AS booked_participants,
           CASE
             WHEN COUNT(b.id) > 0
             THEN ROUND(
               COUNT(b.id) FILTER (WHERE b.booking_status = 'cancelled')::numeric
               / COUNT(b.id)::numeric, 2
             )::text
             ELSE NULL
           END                                                                  AS cancellation_rate
         FROM operator_bookings b
         JOIN operator_tours t ON b.operator_tour_id = t.id
         WHERE b.deleted_at IS NULL
           AND b.booking_date >= $1
           AND b.booking_date <= $2
         GROUP BY b.booking_date
         ORDER BY b.booking_date ASC`,
        [dateFrom, dateTo]
      ),

      // ── Топ-5 туров месяца ───────────────────────────────────────────────
      pool.query<TopTourRow>(
        `SELECT
           t.title                                                              AS tour_title,
           p.name                                                               AS operator_name,
           COUNT(b.id)::text                                                    AS bookings,
           COALESCE(
             SUM(b.final_price) FILTER (WHERE b.booking_status != 'cancelled'), 0
           )::text                                                              AS revenue
         FROM operator_bookings b
         JOIN operator_tours t ON b.operator_tour_id = t.id
         JOIN partners p       ON t.operator_id = p.id
         WHERE b.deleted_at IS NULL
           AND b.booking_date >= $1
           AND b.booking_date <= $2
         GROUP BY t.id, t.title, p.name
         ORDER BY COUNT(b.id) DESC
         LIMIT 5`,
        [dateFrom, dateTo]
      ),

      // ── Предыдущий месяц (для % изменения) ──────────────────────────────
      pool.query<PrevMonthRow>(
        `SELECT
           COALESCE(
             SUM(final_price) FILTER (WHERE booking_status != 'cancelled'), 0
           )::text                                                              AS revenue,
           COUNT(id)::text                                                      AS total_bookings
         FROM operator_bookings
         WHERE deleted_at IS NULL
           AND booking_date >= $1
           AND booking_date <= $2`,
        [prevFrom, prevTo]
      ),
    ]);

    // ── Сводка за месяц ───────────────────────────────────────────────────
    const days = daysResult.rows;
    const monthRevenue   = days.reduce((s, d) => s + Number(d.revenue),             0);
    const monthBookings  = days.reduce((s, d) => s + Number(d.total_bookings),      0);
    const monthNew       = days.reduce((s, d) => s + Number(d.new_bookings),        0);
    const monthConfirmed = days.reduce((s, d) => s + Number(d.confirmed_bookings),  0);
    const monthCancelled = days.reduce((s, d) => s + Number(d.cancelled_bookings),  0);
    const monthCompleted = days.reduce((s, d) => s + Number(d.completed_bookings),  0);

    const prevRevenue  = Number(prevResult.rows[0]?.revenue ?? 0);
    const prevBookings = Number(prevResult.rows[0]?.total_bookings ?? 0);

    // ── Аномальные дни: коэффициент отмен > 30% и есть хотя бы 2 брони ──
    const anomalies = days
      .filter(d => d.cancellation_rate !== null && Number(d.cancellation_rate) >= 0.3 && Number(d.total_bookings) >= 2)
      .map(d => ({
        date:             d.date,
        cancellation_rate: Number(d.cancellation_rate),
        total_bookings:   Number(d.total_bookings),
        cancelled:        Number(d.cancelled_bookings),
      }));

    // ── Максимальная выручка за день (для нормализации heatmap) ───────────
    const maxDayRevenue = Math.max(...days.map(d => Number(d.revenue)), 1);

    return NextResponse.json({
      success: true,
      month:   `${year}-${String(month).padStart(2, '0')}`,
      days: days.map(d => ({
        date:             d.date,
        total:            Number(d.total_bookings),
        new:              Number(d.new_bookings),
        confirmed:        Number(d.confirmed_bookings),
        cancelled:        Number(d.cancelled_bookings),
        completed:        Number(d.completed_bookings),
        revenue:          Number(d.revenue),
        activeOperators:  Number(d.active_operators),
        activeTours:      Number(d.active_tours),
        participants:     Number(d.booked_participants),
        cancellationRate: d.cancellation_rate !== null ? Number(d.cancellation_rate) : null,
        // 0.0–1.0 для heatmap окраски
        demandScore:      maxDayRevenue > 0 ? Number(d.revenue) / maxDayRevenue : 0,
        isAnomaly:        d.cancellation_rate !== null && Number(d.cancellation_rate) >= 0.3 && Number(d.total_bookings) >= 2,
      })),
      topTours: topToursResult.rows.map(t => ({
        tourTitle:    t.tour_title,
        operatorName: t.operator_name,
        bookings:     Number(t.bookings),
        revenue:      Number(t.revenue),
      })),
      summary: {
        revenue:         monthRevenue,
        bookings:        monthBookings,
        new:             monthNew,
        confirmed:       monthConfirmed,
        cancelled:       monthCancelled,
        completed:       monthCompleted,
        cancellationRate: monthBookings > 0 ? Math.round(monthCancelled / monthBookings * 100) : 0,
        vsLastMonth: {
          revenue:  prevRevenue  > 0 ? Math.round((monthRevenue  - prevRevenue)  / prevRevenue  * 100) : null,
          bookings: prevBookings > 0 ? Math.round((monthBookings - prevBookings) / prevBookings * 100) : null,
        },
      },
      anomalies,
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Неизвестная ошибка';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
