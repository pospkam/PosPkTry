/**
 * GET /api/agent/find-tours
 * Поиск свободных дат у операторов для агента.
 *
 * Параметры:
 *   date          — конкретная дата YYYY-MM-DD
 *   date_from     — начало диапазона (если date не задан)
 *   date_to       — конец диапазона
 *   activity_type — тип активности (boat_trip / trekking / fishing / ...)
 *   group_size    — минимальное количество свободных мест (default: 1)
 *
 * Auth: agent | admin
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';
import { requireAgent } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  date:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_from:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  activity_type: z.string().max(50).optional(),
  group_size:    z.coerce.number().int().min(1).max(100).default(1),
  limit:         z.coerce.number().min(1).max(100).default(50),
});

export async function GET(req: NextRequest) {
  const auth = await requireAgent(req);
  if (auth instanceof NextResponse) return auth;

  const sp = new URL(req.url).searchParams;
  const parsed = QuerySchema.safeParse({
    date:          sp.get('date')          ?? undefined,
    date_from:     sp.get('date_from')     ?? undefined,
    date_to:       sp.get('date_to')       ?? undefined,
    activity_type: sp.get('activity_type') ?? undefined,
    group_size:    sp.get('group_size')    ?? undefined,
    limit:         sp.get('limit')         ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Некорректные параметры' }, { status: 400 });
  }

  const { date, date_from, date_to, activity_type, group_size, limit } = parsed.data;

  // Определяем диапазон дат
  const dateStart = date ?? date_from ?? new Date().toISOString().split('T')[0];
  const dateEnd   = date ?? date_to   ?? dateStart;

  const params: unknown[] = [dateStart, dateEnd, group_size, limit];
  let activityFilter = '';
  if (activity_type) {
    params.push(activity_type);
    activityFilter = `AND t.activity_type = $${params.length}`;
  }

  const sql = `
    SELECT
      t.id                                                             AS tour_id,
      t.title,
      t.description,
      t.activity_type,
      t.duration_hours,
      t.max_participants,
      t.difficulty,
      t.season_start,
      t.season_end,
      p.id                                                             AS operator_id,
      p.company_name                                                   AS operator_name,
      p.contacts->>'phone'                                             AS operator_phone,
      a.date                                                           AS available_date,
      (a.available_slots - COALESCE(a.booked_slots, 0))               AS available_spots,
      COALESCE(a.base_price_override, t.base_price)::numeric          AS price,
      ROUND(COALESCE(a.base_price_override, t.base_price) * 0.10)     AS agent_commission
    FROM operator_tours t
    JOIN partners p ON t.operator_id = p.id
    JOIN tour_availability a
      ON a.operator_tour_id = t.id
      AND a.date BETWEEN $1 AND $2
      AND a.deleted_at IS NULL
    WHERE t.is_published  = TRUE
      AND t.deleted_at    IS NULL
      AND (a.available_slots - COALESCE(a.booked_slots, 0)) >= $3
      ${activityFilter}
    ORDER BY a.date ASC, price ASC
    LIMIT $4
  `;

  const rows = await query(sql, params);

  return NextResponse.json({
    success: true,
    data: rows.rows,
    meta: {
      date_start: dateStart,
      date_end:   dateEnd,
      group_size,
      total:      rows.rowCount ?? 0,
    },
  });
}
