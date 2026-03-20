/**
 * GET  /api/admin/operator-tours — Список всех туров операторов (admin)
 * POST /api/admin/operator-tours — Создать тур от имени оператора (admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { query } from '@/lib/database';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
  search: z.string().max(200).optional(),
  operator_id: z.string().uuid().optional(),
  activity_type: z.string().optional(),
  location_type: z.string().optional(),
  is_published: z.enum(['true', 'false']).optional(),
});

export async function GET(request: NextRequest) {
  const authOrResponse = await requireAdmin(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  const sp = Object.fromEntries(request.nextUrl.searchParams.entries());
  const parseResult = QuerySchema.safeParse(sp);
  if (!parseResult.success) {
    return NextResponse.json({ error: 'Неверные параметры запроса' }, { status: 400 });
  }
  const { limit, offset, search, operator_id, activity_type, location_type, is_published } = parseResult.data;

  const conditions: string[] = ['ot.deleted_at IS NULL'];
  const values: unknown[] = [];
  let idx = 1;

  if (search) {
    conditions.push(`(ot.title ILIKE $${idx} OR p.company_name ILIKE $${idx})`);
    values.push(`%${search}%`);
    idx++;
  }
  if (operator_id) {
    conditions.push(`ot.operator_id = $${idx++}`);
    values.push(operator_id);
  }
  if (activity_type) {
    conditions.push(`ot.activity_type = $${idx++}`);
    values.push(activity_type);
  }
  if (location_type) {
    conditions.push(`ot.location_type = $${idx++}`);
    values.push(location_type);
  }
  if (is_published !== undefined) {
    conditions.push(`ot.is_published = $${idx++}`);
    values.push(is_published === 'true');
  }

  const where = conditions.join(' AND ');

  const countResult = await query(
    `SELECT COUNT(*) FROM operator_tours ot
     LEFT JOIN partners p ON ot.operator_id = p.id
     WHERE ${where}`,
    values
  );
  const total = parseInt(countResult.rows[0].count as string, 10);

  values.push(limit, offset);
  const dataResult = await query(
    `SELECT
       ot.id, ot.operator_id, ot.title, ot.description, ot.short_description,
       ot.location_type, ot.activity_type, ot.location_name,
       ot.latitude, ot.longitude,
       ot.base_price, ot.price_old, ot.price_unit,
       ot.max_participants, ot.min_participants,
       ot.duration_hours, ot.duration_type, ot.multi_day_count,
       ot.season_start, ot.season_end, ot.seasonal_only,
       ot.difficulty, ot.weather_dependent,
       ot.min_visibility_m, ot.max_wind_kmh, ot.max_precipitation_mm,
       ot.is_active, ot.is_published,
       ot.included, ot.not_included, ot.what_to_bring,
       ot.photos, ot.tour_image, ot.agent_route_id,
       ot.notes, ot.created_at, ot.updated_at,
       p.company_name AS operator_name,
       COALESCE(
         array_agg(tt.tag ORDER BY tt.tag) FILTER (WHERE tt.tag IS NOT NULL),
         '{}'::text[]
       ) AS tags
     FROM operator_tours ot
     LEFT JOIN partners p ON ot.operator_id = p.id
     LEFT JOIN operator_tour_tags tt ON ot.id = tt.tour_id
     WHERE ${where}
     GROUP BY ot.id, p.company_name
     ORDER BY ot.created_at DESC
     LIMIT $${idx++} OFFSET $${idx++}`,
    values
  );

  return NextResponse.json({
    success: true,
    data: dataResult.rows,
    meta: {
      total,
      limit,
      offset,
      pages: Math.ceil(total / limit),
    },
  });
}
