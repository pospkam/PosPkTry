/**
 * GET   /api/hub/operator/tours/[id] — Get single tour
 * PATCH /api/hub/operator/tours/[id] — Update tour
 * DELETE /api/hub/operator/tours/[id] — Soft-delete tour
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth/middleware';
import {
  UpdateTourSchema,
  getTourById,
  softDeleteTour,
} from '@/lib/api/operator-tours';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

async function getOperatorId(userId: string): Promise<string | null> {
  const result = await query(
    `SELECT id FROM partners WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return (result.rows[0]?.id as string) || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tourId = BigInt(params.id);

    const authOrResponse = await requireOperator(request);
    if (authOrResponse instanceof NextResponse) return authOrResponse;

    const isAdmin = authOrResponse.role === 'admin';

    const operator_id = isAdmin ? null : await getOperatorId(authOrResponse.userId);
    if (!isAdmin && !operator_id) {
      return NextResponse.json({ error: 'Not an operator' }, { status: 403 });
    }

    const tour = await getTourById(tourId);
    if (!tour || (!isAdmin && tour.operator_id !== operator_id)) {
      return NextResponse.json({ error: 'Tour not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: tour });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tour' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tourId = BigInt(params.id);

    const authOrResponse = await requireOperator(request);
    if (authOrResponse instanceof NextResponse) return authOrResponse;

    const isAdmin = authOrResponse.role === 'admin';

    const operator_id = isAdmin ? null : await getOperatorId(authOrResponse.userId);
    if (!isAdmin && !operator_id) {
      return NextResponse.json({ error: 'Not an operator' }, { status: 403 });
    }

    const tour = await getTourById(tourId);
    if (!tour || (!isAdmin && tour.operator_id !== operator_id)) {
      return NextResponse.json({ error: 'Tour not found' }, { status: 404 });
    }

    const body = await request.json();
    const input = UpdateTourSchema.parse(body);

    // Build SET clause dynamically from provided fields
    const fields: string[] = [];
    const values: unknown[] = [];
    let idx = 1;

    const allowed = [
      'title', 'short_description', 'description',
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
      'photos', 'tour_image',
      'available_slots', 'next_available_date',
    ] as const;

    for (const key of allowed) {
      const rec = input as Record<string, unknown>;
      if (key in rec && rec[key] !== undefined) {
        fields.push(`${key} = $${idx++}`);
        values.push(rec[key]);
      }
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    values.push(tourId);
    const result = await query(
      `UPDATE operator_tours SET ${fields.join(', ')}, updated_at = NOW()
       WHERE id = $${idx} AND deleted_at IS NULL
       RETURNING id, title, updated_at`,
      values
    );

    // Update tags if provided
    if (input.tags !== undefined) {
      await query(`DELETE FROM operator_tour_tags WHERE tour_id = $1`, [tourId]);
      for (const tag of input.tags) {
        await query(
          `INSERT INTO operator_tour_tags (tour_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
          [tourId, tag.trim().toLowerCase()]
        );
      }
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update tour' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tourId = BigInt(params.id);

    const authOrResponse = await requireOperator(request);
    if (authOrResponse instanceof NextResponse) return authOrResponse;

    const isAdmin = authOrResponse.role === 'admin';

    const operator_id = isAdmin ? null : await getOperatorId(authOrResponse.userId);
    if (!isAdmin && !operator_id) {
      return NextResponse.json({ error: 'Not an operator' }, { status: 403 });
    }

    const deleted = await softDeleteTour(tourId, isAdmin ? undefined : operator_id);
    if (!deleted) {
      return NextResponse.json({ error: 'Tour not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: 'Tour deleted' });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete tour' }, { status: 500 });
  }
}
