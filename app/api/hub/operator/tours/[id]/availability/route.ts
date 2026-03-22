/**
 * POST /api/hub/operator/tours/[id]/availability — Add availability slots
 * GET  /api/hub/operator/tours/[id]/availability — Calendar view (paginated date range)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth/middleware';
import {
  AddAvailabilitySchema,
  getTourById,
  addAvailability,
  getAvailability,
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

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tourId = BigInt(params.id);

    const authOrResponse = await requireOperator(request);
    if (authOrResponse instanceof NextResponse) return authOrResponse;

    const operator_id = await getOperatorId(authOrResponse.userId);
    if (!operator_id) {
      return NextResponse.json({ error: 'Not an operator' }, { status: 403 });
    }

    const tour = await getTourById(tourId);
    if (!tour || tour.operator_id !== operator_id) {
      return NextResponse.json({ error: 'Tour not found' }, { status: 404 });
    }

    const body = await request.json();
    const { dates } = AddAvailabilitySchema.parse(body);

    await addAvailability(tourId, dates);

    return NextResponse.json(
      {
        success: true,
        message: `Added ${dates.length} availability dates`,
        dates_added: dates.length,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    if (error instanceof Error && error.message.includes('validation')) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to add availability' }, { status: 500 });
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tourId = BigInt(params.id);
    const { searchParams } = new URL(request.url);
    const from = searchParams.get('from') || new Date().toISOString().split('T')[0];
    const to =
      searchParams.get('to') ||
      new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const authOrResponse = await requireOperator(request);
    if (authOrResponse instanceof NextResponse) return authOrResponse;

    const rows = await getAvailability(tourId, from, to);

    return NextResponse.json({
      success: true,
      data: rows,
      date_range: { from, to },
      count: rows.length,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch availability' }, { status: 500 });
  }
}
