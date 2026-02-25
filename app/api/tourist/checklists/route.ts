import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAuth } from '@/lib/auth/middleware';
import { getTouristProfile } from '@/lib/auth/tourist-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tourist/checklists - Get tourist checklists
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const profile = await getTouristProfile(userOrResponse.userId);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Профиль не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const tripId = searchParams.get('tripId');

    let queryText = `SELECT * FROM tourist_checklists WHERE tourist_id = $1`;
    const params: any[] = [profile.id];

    if (tripId) {
      queryText += ` AND trip_id = $2`;
      params.push(tripId);
    }

    queryText += ` ORDER BY created_at DESC`;

    const result = await query(queryText, params);

    return NextResponse.json({
      success: true,
      data: result.rows
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error fetching checklists:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении чек-листов' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

/**
 * POST /api/tourist/checklists - Create checklist
 */
export async function POST(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const profile = await getTouristProfile(userOrResponse.userId);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Профиль не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const body = await request.json();
    const { name, items, tripId, templateId } = body;

    if (!name || name.length < 3) {
      return NextResponse.json(
        { success: false, error: 'Укажите название чек-листа' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO tourist_checklists (tourist_id, trip_id, template_id, name, items)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [profile.id, tripId || null, templateId || null, name, JSON.stringify(items || [])]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error creating checklist:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при создании чек-листа' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

/**
 * PUT /api/tourist/checklists - Update checklist
 */
export async function PUT(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const profile = await getTouristProfile(userOrResponse.userId);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Профиль не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const body = await request.json();
    const { id, name, items } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Укажите ID чек-листа' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }

    if (items !== undefined) {
      updates.push(`items = $${paramIndex}::jsonb`);
      values.push(JSON.stringify(items));
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Нет полей для обновления' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    values.push(id, profile.id);

    const result = await query(
      `UPDATE tourist_checklists SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${paramIndex} AND tourist_id = $${paramIndex + 1}
       RETURNING *`,
      values
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error updating checklist:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при обновлении чек-листа' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
