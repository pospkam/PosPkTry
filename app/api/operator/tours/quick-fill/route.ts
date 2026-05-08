/**
 * PATCH /api/operator/tours/quick-fill
 * Quick update of specific tour fields
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { requireOperator } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

export async function PATCH(request: NextRequest) {
  const userOrResponse = await requireOperator(request);
  if (userOrResponse instanceof NextResponse) {
    return userOrResponse;
  }

  const userId = userOrResponse.userId;

  try {
    const partnerRes = await pool.query<{ id: string }>(
      `SELECT id FROM partners WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    const operatorId = partnerRes.rows[0]?.id;
    if (!operatorId) {
      return NextResponse.json({ error: 'Operator not found' }, { status: 403 });
    }

    const body = await request.json();
    const { tourId, field, value } = body;

    if (!tourId || !field || value === undefined) {
      return NextResponse.json(
        { error: 'Missing tourId, field, or value' },
        { status: 400 }
      );
    }

    // Allowed fields to update via quick-fill
    const ALLOWED_FIELDS = [
      'title', 'description', 'short_description',
      'base_price', 'price_old', 'price_unit',
      'location_type', 'activity_type', 'location_name',
      'latitude', 'longitude', 'difficulty',
      'duration_hours', 'duration_type',
      'season_start', 'season_end',
    ];

    if (!ALLOWED_FIELDS.includes(field)) {
      return NextResponse.json(
        { error: `Field '${field}' is not allowed for quick-fill` },
        { status: 400 }
      );
    }

    // Verify tour belongs to operator
    const { rows: tours } = await pool.query(
      `SELECT id FROM operator_tours WHERE id = $1 AND operator_id = $2 AND deleted_at IS NULL`,
      [tourId, operatorId]
    );

    if (tours.length === 0) {
      return NextResponse.json(
        { error: 'Tour not found or access denied' },
        { status: 404 }
      );
    }

    // Update field
    const updateQuery = `
      UPDATE operator_tours
      SET ${field} = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, ${field}
    `;

    const { rows } = await pool.query(updateQuery, [value, tourId]);

    if (rows.length === 0) {
      throw new Error('Failed to update tour');
    }

    return NextResponse.json({
      success: true,
      data: {
        tourId,
        field,
        value: rows[0][field],
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update tour field' },
      { status: 500 }
    );
  }
}
