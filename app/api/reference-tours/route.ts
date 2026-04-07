import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';
import { verifyToken, extractToken } from '@/lib/auth/jwt';
import type { ReferenceTour } from '@/lib/types/db-rows';

const RefTourSchema = z.object({
  activity_type: z.string().min(2),
  zone: z.string().min(2),
  price_per_person: z.number().positive(),
  duration_hours: z.number().positive(),
  max_participants: z.number().positive().int(),
  description: z.string().optional(),
});

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activity = searchParams.get('activity');
    const zone = searchParams.get('zone');

    let sql = 'SELECT * FROM reference_tours WHERE 1=1';
    const params: (string | number)[] = [];

    if (activity) {
      sql += ` AND activity_type = $${params.length + 1}`;
      params.push(activity);
    }

    if (zone) {
      sql += ` AND zone = $${params.length + 1}`;
      params.push(zone);
    }

    sql += ' ORDER BY created_at DESC';

    const result = await query<ReferenceTour>(sql, params);
    return NextResponse.json({ tours: result.rows });
  } catch {
    return NextResponse.json(
      { error: 'Failed to fetch tours' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Check authorization
    const authHeader = request.headers.get('Authorization');
    const token = extractToken(authHeader);
    if (!token) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const payload = await verifyToken(token);
    if (!payload || payload.role !== 'operator') {
      return NextResponse.json(
        { error: 'Forbidden: operator only' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const parsed = RefTourSchema.parse(body);

    // Get operator_id from user_id
    const opResult = await query(
      'SELECT id FROM operators WHERE user_id = $1',
      [parseInt(payload.userId)]
    );

    if (!opResult.rows.length) {
      return NextResponse.json(
        { error: 'Operator profile not found' },
        { status: 404 }
      );
    }

    const operator_id = opResult.rows[0].id;

    const sql = `
      INSERT INTO reference_tours
      (operator_id, activity_type, zone, price_per_person, duration_hours, max_participants, description)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    const result = await query<ReferenceTour>(sql, [
      operator_id,
      parsed.activity_type,
      parsed.zone,
      parsed.price_per_person,
      parsed.duration_hours,
      parsed.max_participants,
      parsed.description || null,
    ]);

    return NextResponse.json(
      { success: true, tour: result.rows[0] },
      { status: 201 }
    );
  } catch (error) {

    return NextResponse.json(
      { error: 'Failed to create tour' },
      { status: 400 }
    );
  }
}
