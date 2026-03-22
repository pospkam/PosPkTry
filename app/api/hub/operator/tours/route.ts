/**
 * POST /api/hub/operator/tours   — Create tour
 * GET  /api/hub/operator/tours   — List tours (paginated)
 * Auth: operator role
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth/middleware';
import {
  CreateTourSchema,
  PaginationSchema,
  createTour,
  getToursByOperator,
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

export async function GET(request: NextRequest) {
  try {
    const authOrResponse = await requireOperator(request);
    if (authOrResponse instanceof NextResponse) return authOrResponse;

    const operator_id = await getOperatorId(authOrResponse.userId);
    if (!operator_id) {
      return NextResponse.json({ error: 'Not an operator' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const pagination = PaginationSchema.parse({
      limit: searchParams.get('limit'),
      offset: searchParams.get('offset'),
    });

    const data = await getToursByOperator(operator_id, pagination);

    return NextResponse.json({
      success: true,
      data: data.rows,
      pagination: {
        total: data.total,
        limit: data.limit,
        offset: data.offset,
        has_more: data.offset + data.rows.length < data.total,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tours' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const authOrResponse = await requireOperator(request);
    if (authOrResponse instanceof NextResponse) return authOrResponse;

    const operator_id = await getOperatorId(authOrResponse.userId);
    if (!operator_id) {
      return NextResponse.json({ error: 'You are not registered as an operator' }, { status: 403 });
    }

    const body = await request.json();
    const input = CreateTourSchema.parse(body);

    const result = await createTour(operator_id, authOrResponse.userId, input);

    return NextResponse.json(
      {
        success: true,
        data: result,
        message: 'Tour created successfully. Add availability dates next.',
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
    return NextResponse.json({ error: 'Failed to create tour' }, { status: 500 });
  }
}
