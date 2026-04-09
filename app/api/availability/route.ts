/**
 * GET /api/availability?month=YYYY-MM[&activity=trekking]
 *
 * Публичный. Возвращает посуточную картину доступности туров на месяц:
 *   - кол-во туров с открытыми слотами
 *   - суммарное кол-во свободных мест
 *   - минимальная цена дня
 *   - типы активностей
 *
 * Используется в публичном calendar-ре (/calendar) для рендера heatmap.
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

interface DayRow {
  date: string;
  tour_count: string;
  free_slots: string;
  price_from: string | null;
  activities: string[];
  operators: string;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const monthParam = searchParams.get('month');
  const activity   = searchParams.get('activity') ?? null;

  const now = new Date();
  const [year, month] = monthParam
    ? monthParam.split('-').map(Number)
    : [now.getFullYear(), now.getMonth() + 1];

  const dateFrom = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay  = new Date(year, month, 0).getDate();
  const dateTo   = `${year}-${String(month).padStart(2, '0')}-${lastDay}`;

  // Не показываем прошлые даты
  const effectiveFrom = dateFrom < now.toISOString().slice(0, 10)
    ? now.toISOString().slice(0, 10)
    : dateFrom;

  const params: unknown[] = [effectiveFrom, dateTo];
  let activityFilter = '';
  if (activity) {
    params.push(activity);
    activityFilter = `AND t.activity_type = $${params.length}`;
  }

  try {
    const { rows } = await pool.query<DayRow>(
      `SELECT
         ta.date::text,
         COUNT(DISTINCT ta.operator_tour_id)::text             AS tour_count,
         SUM(ta.available_slots - ta.booked_slots)::text       AS free_slots,
         MIN(COALESCE(ta.base_price_override, t.base_price))::text AS price_from,
         ARRAY_AGG(DISTINCT t.activity_type)                   AS activities,
         COUNT(DISTINCT t.operator_id)::text                   AS operators
       FROM tour_availability ta
       JOIN operator_tours t ON ta.operator_tour_id = t.id
       WHERE ta.date >= $1
         AND ta.date <= $2
         AND ta.is_cancelled = false
         AND (ta.available_slots - ta.booked_slots) > 0
         AND t.is_active = true
         AND t.is_published = true
         ${activityFilter}
       GROUP BY ta.date
       ORDER BY ta.date ASC`,
      params
    );

    const days = rows.map(r => ({
      date:       r.date,
      tourCount:  Number(r.tour_count),
      freeSlots:  Number(r.free_slots),
      priceFrom:  r.price_from !== null ? Number(r.price_from) : null,
      activities: (r.activities ?? []).filter(Boolean) as string[],
      operators:  Number(r.operators),
    }));

    return NextResponse.json({
      success: true,
      month:   `${year}-${String(month).padStart(2, '0')}`,
      days,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ошибка';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
