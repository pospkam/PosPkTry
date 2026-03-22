import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAuth } from '@/lib/auth/middleware';
import { getTouristProfile } from '@/lib/auth/tourist-helpers';

const CreateChecklistSchema = z.object({
  name: z.string().min(3, 'Название чек-листа минимум 3 символа'),
  items: z.array(z.unknown()).optional(),
  tripId: z.string().uuid('Некорректный ID поездки').optional(),
  templateId: z.string().uuid('Некорректный ID шаблона').optional(),
});

const UpdateChecklistSchema = z.object({
  id: z.string().uuid('Укажите ID чек-листа'),
  name: z.string().min(1, 'Название не может быть пустым').optional(),
  items: z.array(z.unknown()).optional(),
});

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
    const params: unknown[] = [profile.id];

    if (tripId) {
      queryText += ` AND trip_id = $2`;
      params.push(tripId);
    }

    queryText += ` ORDER BY created_at DESC`;

    const result = await query(queryText, params);

    return NextResponse.json({
      success: true,
      data: result.rows
    } as ApiResponse<unknown>);
  } catch (error) {
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
    const parsed = CreateChecklistSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' } as ApiResponse<null>,
        { status: 400 }
      );
    }
    const { name, items, tripId, templateId } = parsed.data;

    const result = await query(
      `INSERT INTO tourist_checklists (tourist_id, trip_id, template_id, name, items)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [profile.id, tripId || null, templateId || null, name, JSON.stringify(items || [])]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    } as ApiResponse<unknown>);
  } catch (error) {
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
    const parsed = UpdateChecklistSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' } as ApiResponse<null>,
        { status: 400 }
      );
    }
    const { id, name, items } = parsed.data;

    const updates: string[] = [];
    const values: unknown[] = [];
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
    } as ApiResponse<unknown>);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка при обновлении чек-листа' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
