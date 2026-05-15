import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { TourUpdateRow } from '@/lib/types/db-rows';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const { id } = await params;

    const result = await query(
      `SELECT t.*, p.name as operator_name
       FROM operator_tours t
       LEFT JOIN partners p ON t.operator_id = p.id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Тур не найден' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] } as ApiResponse<unknown>);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении тура' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const { id } = await params;
    const body = await request.json() as Record<string, unknown>;

    const allowedFields = ['title', 'description', 'category', 'difficulty', 'base_price', 'is_active'];
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    for (const field of allowedFields) {
      if (field in body) {
        updates.push(`${field} = $${paramIndex}`);
        values.push(body[field]);
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return NextResponse.json({ success: false, error: 'Нет данных для обновления' }, { status: 400 });
    }

    values.push(id);
    const result = await query<TourUpdateRow>(
      `UPDATE operator_tours SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING id, title AS name, is_active, updated_at`,
      values
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Тур не найден' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] } as ApiResponse<unknown>);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка при обновлении тура' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const { id } = await params;

    await query('UPDATE operator_tours SET is_active = false, updated_at = NOW() WHERE id = $1', [id]);

    return NextResponse.json({ success: true, message: 'Тур деактивирован' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка при удалении тура' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
