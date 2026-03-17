/**
 * PATCH /api/hub/operator/bookings/[id] — Update booking status
 * GET  /api/hub/operator/bookings/[id] — Get booking details
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth/middleware';
import { query } from '@/lib/database';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const PatchSchema = z.object({
  booking_status: z.enum(['new', 'confirmed', 'cancelled', 'completed', 'no_show']).optional(),
  cancellation_reason: z.string().max(255).optional(),
  notes: z.string().max(1000).optional(),
});

async function getOperatorId(userId: string): Promise<string | null> {
  const r = await query(`SELECT id FROM partners WHERE user_id = $1 LIMIT 1`, [userId]);
  return (r.rows[0]?.id as string) || null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authOrResponse = await requireOperator(request);
    if (authOrResponse instanceof NextResponse) return authOrResponse;

    const operator_id = await getOperatorId(authOrResponse.userId);
    if (!operator_id) return NextResponse.json({ error: 'Not an operator' }, { status: 403 });

    const result = await query(
      `SELECT b.*,
              t.title as tour_title,
              t.location_name,
              t.base_price as tour_base_price
       FROM operator_bookings b
       JOIN operator_tours t ON b.operator_tour_id = t.id
       WHERE b.id = $1 AND t.operator_id = $2 AND b.deleted_at IS NULL LIMIT 1`,
      [BigInt(params.id), operator_id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    console.error('[OPERATOR API] Get booking error:', error);
    return NextResponse.json({ error: 'Failed to fetch booking' }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const authOrResponse = await requireOperator(request);
    if (authOrResponse instanceof NextResponse) return authOrResponse;

    const operator_id = await getOperatorId(authOrResponse.userId);
    if (!operator_id) return NextResponse.json({ error: 'Not an operator' }, { status: 403 });

    // Verify ownership
    const ownership = await query(
      `SELECT b.id, b.booking_status FROM operator_bookings b
       JOIN operator_tours t ON b.operator_tour_id = t.id
       WHERE b.id = $1 AND t.operator_id = $2 AND b.deleted_at IS NULL LIMIT 1`,
      [BigInt(params.id), operator_id]
    );
    if (ownership.rows.length === 0) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    const body = await request.json();
    const input = PatchSchema.parse(body);

    const sets: string[] = ['updated_at = NOW()'];
    const values: unknown[] = [];
    let idx = 1;

    if (input.booking_status) {
      sets.push(`booking_status = $${idx++}`);
      values.push(input.booking_status);
      if (input.booking_status === 'cancelled') {
        sets.push(`cancelled_at = NOW()`);
      }
    }
    if (input.cancellation_reason !== undefined) {
      sets.push(`cancellation_reason = $${idx++}`);
      values.push(input.cancellation_reason);
    }
    if (input.notes !== undefined) {
      sets.push(`notes = $${idx++}`);
      values.push(input.notes);
    }

    values.push(BigInt(params.id));

    const result = await query(
      `UPDATE operator_bookings SET ${sets.join(', ')}
       WHERE id = $${idx}
       RETURNING id, booking_status, updated_at`,
      values
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }
    console.error('[OPERATOR API] Update booking error:', error);
    return NextResponse.json({ error: 'Failed to update booking' }, { status: 500 });
  }
}
