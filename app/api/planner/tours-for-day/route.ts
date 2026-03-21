/**
 * GET /api/planner/tours-for-day
 *
 * Возвращает туры из operator_tours для конкретной активности дня.
 * Используется TripBuilder v2 для показа маркетплейс-туров на карточке дня.
 *
 * Query params:
 *   activity_type — тип активности (fishing, trekking, volcano …)
 *   limit         — кол-во туров (default 3, max 6)
 *
 * Открытый маршрут — не требует авторизации.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  activity_type: z.string().min(1).max(50),
  limit:         z.coerce.number().min(1).max(6).default(3),
});

interface TourRow {
  id:                string;
  title:             string;
  short_description: string | null;
  base_price:        string;
  price_unit:        string | null;
  duration_hours:    number | null;
  tour_image:        string | null;
  operator_name:     string;
  operator_slug:     string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const parsed = QuerySchema.safeParse({
    activity_type: searchParams.get('activity_type'),
    limit:         searchParams.get('limit'),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Параметр activity_type обязателен' },
      { status: 400 }
    );
  }

  const { activity_type, limit } = parsed.data;

  const { rows } = await pool.query<TourRow>(`
    SELECT
      ot.id,
      ot.title,
      ot.short_description,
      ot.base_price::text,
      ot.price_unit,
      ot.duration_hours,
      ot.tour_image,
      p.name  AS operator_name,
      p.slug  AS operator_slug
    FROM operator_tours ot
    JOIN partners p ON p.id = ot.operator_id
    WHERE ot.activity_type = $1
      AND ot.is_active    = true
      AND ot.is_published = true
      AND ot.deleted_at IS NULL
    ORDER BY ot.rating DESC NULLS LAST, ot.base_price ASC
    LIMIT $2
  `, [activity_type, limit]);

  return NextResponse.json({ success: true, tours: rows });
}
