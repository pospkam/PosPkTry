/**
 * GET /api/planner/partners?activity_type=fishing
 * Returns operators relevant for a given day's activity type.
 * Prioritises operators with published tours for that activity_type,
 * falls back to all public operators ordered by rating.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

const VALID_ACTIVITY_TYPES = [
  'trekking', 'fishing', 'helicopter', 'bears', 'snowmobile', 'boat_trip', 'rafting',
  'volcano', 'hot_spring', 'geyser', 'sea', 'mountain', 'river', 'thermal', 'other',
] as const;

const QuerySchema = z.object({
  activity_type: z.enum(VALID_ACTIVITY_TYPES).default('trekking'),
});

interface PartnerRow {
  id: string;
  name: string;
  slug: string;
  rating: number;
  review_count: number;
  hero_image: string | null;
  short_description: string;
  contacts: unknown;
  activity_types: string[];
  has_matching_tours: boolean;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = QuerySchema.safeParse({ activity_type: searchParams.get('activity_type') ?? undefined });
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Некорректный тип активности', details: parsed.error.errors },
        { status: 400 }
      );
    }
    const { activity_type: activityType } = parsed.data;

    const { rows } = await pool.query<PartnerRow>(`
      WITH tour_match AS (
        SELECT
          operator_id,
          ARRAY_AGG(DISTINCT activity_type) FILTER (WHERE activity_type IS NOT NULL) AS activity_types
        FROM operator_tours
        WHERE is_active = TRUE
          AND is_published = TRUE
          AND deleted_at IS NULL
        GROUP BY operator_id
      )
      SELECT
        p.id,
        p.name,
        p.slug,
        COALESCE(p.rating, 0)        AS rating,
        COALESCE(p.review_count, 0)  AS review_count,
        p.hero_image,
        COALESCE(p.short_description, p.description, '') AS short_description,
        p.contacts,
        COALESCE(tm.activity_types, '{}') AS activity_types,
        ($1 = ANY(COALESCE(tm.activity_types, '{}'))) AS has_matching_tours
      FROM partners p
      LEFT JOIN tour_match tm ON tm.operator_id = p.id
      WHERE p.is_public = TRUE
        AND p.status = 'active'
        AND p.category = 'operator'
      ORDER BY
        ($1 = ANY(COALESCE(tm.activity_types, '{}'))) DESC,
        COALESCE(p.rating, 0) DESC
      LIMIT 6
    `, [activityType]);

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ошибка при загрузке операторов';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
