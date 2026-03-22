/**
 * GET /api/planner/tours-for-day
 *
 * Returns operator tours for a specific activity type, optionally filtered by zone.
 * Used by TripBuilder v2 to show marketplace tours on day cards.
 *
 * Query params:
 *   activity_type -- type of activity (fishing, trekking, volcano ...)
 *   zone          -- optional: filter by geographic zone (avachinsky, western, eastern, northern)
 *   limit         -- number of tours (default 3, max 6)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  activity_type: z.string().min(1).max(50),
  zone:          z.enum(['avachinsky', 'western', 'eastern', 'northern']).optional(),
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
    zone:          searchParams.get('zone') || undefined,
    limit:         searchParams.get('limit'),
  });

  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Параметр activity_type обязателен' },
      { status: 400 },
    );
  }

  const { activity_type, zone, limit } = parsed.data;

  // If zone is specified, try filtered query first
  if (zone) {
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
      LEFT JOIN agent_route_knowledge ark ON ark.id = ot.agent_route_id
      WHERE ot.activity_type = $1
        AND ot.is_active    = true
        AND ot.is_published = true
        AND ot.deleted_at IS NULL
        AND ark.zone = $2
      ORDER BY ot.rating DESC NULLS LAST, ot.base_price ASC
      LIMIT $3
    `, [activity_type, zone, limit]);

    // If zone filter returned results, use them
    if (rows.length > 0) {
      return NextResponse.json({ success: true, tours: rows });
    }
    // Otherwise fall through to global query
  }

  // Global query (no zone filter)
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
