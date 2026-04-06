/**
 * GET    /api/admin/operator-tours/[id] — Получить тур (admin)
 * PATCH  /api/admin/operator-tours/[id] — Обновить любые поля тура (admin)
 * DELETE /api/admin/operator-tours/[id] — Soft-delete тура (admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { query } from '@/lib/database';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const UpdateSchema = z.object({
  title: z.string().min(5).max(255).optional(),
  description: z.string().max(2000).nullable().optional(),
  short_description: z.string().max(500).nullable().optional(),
  location_type: z.enum(['volcano', 'hot_spring', 'bay', 'lake', 'mountain', 'river', 'geyser', 'other']).optional(),
  activity_type: z.enum(['trekking', 'thermal', 'boat_trip', 'rafting', 'fishing', 'bears', 'helicopter', 'jeep', 'other']).optional(),
  location_name: z.string().min(3).max(255).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  base_price: z.number().positive().optional(),
  price_old: z.number().positive().nullable().optional(),
  price_unit: z.enum(['per_tour', 'per_person', 'per_day_per_person']).optional(),
  max_participants: z.number().positive().optional(),
  min_participants: z.number().positive().nullable().optional(),
  duration_hours: z.number().positive().nullable().optional(),
  duration_type: z.enum(['day', 'multi_day']).nullable().optional(),
  multi_day_count: z.number().positive().nullable().optional(),
  season_start: z.string().date().nullable().optional(),
  season_end: z.string().date().nullable().optional(),
  seasonal_only: z.boolean().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']).nullable().optional(),
  weather_dependent: z.boolean().optional(),
  min_visibility_m: z.number().nonnegative().optional(),
  max_wind_kmh: z.number().nonnegative().optional(),
  max_precipitation_mm: z.number().nonnegative().optional(),
  is_active: z.boolean().optional(),
  is_published: z.boolean().optional(),
  included: z.array(z.string().max(200)).max(30).optional(),
  not_included: z.array(z.string().max(200)).max(30).optional(),
  what_to_bring: z.array(z.string().max(200)).max(30).optional(),
  tour_image: z.string().max(500).nullable().optional(),
  photos: z.array(z.string().max(500)).max(20).optional(),
  agent_route_id: z.string().uuid().nullable().optional(),
  notes: z.string().max(1000).nullable().optional(),
  tags: z.array(z.string().max(100)).max(20).optional(),
});

const ALLOWED_FIELDS = [
  'title', 'description', 'short_description',
  'location_type', 'activity_type', 'location_name',
  'latitude', 'longitude',
  'base_price', 'price_old', 'price_unit',
  'max_participants', 'min_participants',
  'duration_hours', 'duration_type', 'multi_day_count',
  'season_start', 'season_end', 'seasonal_only',
  'difficulty', 'weather_dependent',
  'min_visibility_m', 'max_wind_kmh', 'max_precipitation_mm',
  'is_active', 'is_published',
  'included', 'not_included', 'what_to_bring',
  'photos', 'tour_image', 'agent_route_id', 'notes',
] as const;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authOrResponse = await requireAdmin(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  const tourId = BigInt(params.id);

  const result = await query(
    `SELECT
       ot.*, p.company_name AS operator_name,
       COALESCE(
         array_agg(tt.tag ORDER BY tt.tag) FILTER (WHERE tt.tag IS NOT NULL),
         '{}'::text[]
       ) AS tags
     FROM operator_tours ot
     LEFT JOIN partners p ON ot.operator_id = p.id
     LEFT JOIN operator_tour_tags tt ON ot.id = tt.tour_id
     WHERE ot.id = $1 AND ot.deleted_at IS NULL
     GROUP BY ot.id, p.company_name`,
    [tourId]
  );

  if (!result.rows[0]) {
    return NextResponse.json({ error: 'Тур не найден' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: result.rows[0] });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authOrResponse = await requireAdmin(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  const tourId = BigInt(params.id);

  // Проверим что тур существует
  const existing = await query(
    `SELECT id FROM operator_tours WHERE id = $1 AND deleted_at IS NULL`,
    [tourId]
  );
  if (!existing.rows[0]) {
    return NextResponse.json({ error: 'Тур не найден' }, { status: 404 });
  }

  const body: unknown = await request.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: 'Неверный JSON' }, { status: 400 });
  }

  const parseResult = UpdateSchema.safeParse(body);
  if (!parseResult.success) {
    return NextResponse.json(
      { error: 'Ошибка валидации', details: parseResult.error.flatten() },
      { status: 422 }
    );
  }

  const input = parseResult.data;
  const { tags, ...rest } = input;

  // Строим SET-список из переданных полей
  const fields: string[] = [];
  const values: unknown[] = [];
  let idx = 1;

  for (const key of ALLOWED_FIELDS) {
    if (key in rest && (rest as Record<string, unknown>)[key] !== undefined) {
      const val = (rest as Record<string, unknown>)[key];
      fields.push(`${key} = $${idx++}`);
      values.push(val);
    }
  }

  if (fields.length === 0 && tags === undefined) {
    return NextResponse.json({ error: 'Нет полей для обновления' }, { status: 400 });
  }

  if (fields.length > 0) {
    values.push(tourId);
    await query(
      `UPDATE operator_tours SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${idx} AND deleted_at IS NULL`,
      values
    );
  }

  // Обновляем теги
  if (tags !== undefined) {
    await query(`DELETE FROM operator_tour_tags WHERE tour_id = $1`, [tourId]);
    for (const tag of tags) {
      await query(
        `INSERT INTO operator_tour_tags (tour_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [tourId, tag.trim().toLowerCase()]
      );
    }
  }

  const updated = await query(
    `SELECT ot.*, p.company_name AS operator_name,
       COALESCE(array_agg(tt.tag ORDER BY tt.tag) FILTER (WHERE tt.tag IS NOT NULL), '{}'::text[]) AS tags
     FROM operator_tours ot
     LEFT JOIN partners p ON ot.operator_id = p.id
     LEFT JOIN operator_tour_tags tt ON ot.id = tt.tour_id
     WHERE ot.id = $1 GROUP BY ot.id, p.company_name`,
    [tourId]
  );

  return NextResponse.json({ success: true, data: updated.rows[0] });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const authOrResponse = await requireAdmin(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  const tourId = BigInt(params.id);

  const result = await query(
    `UPDATE operator_tours SET deleted_at = NOW()
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING id`,
    [tourId]
  );

  if (!result.rows[0]) {
    return NextResponse.json({ error: 'Тур не найден' }, { status: 404 });
  }

  return NextResponse.json({ success: true, message: 'Тур удалён' });
}
