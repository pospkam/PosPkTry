import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireAdmin } from '@/lib/auth/middleware';
import { ApiResponse } from '@/types';
import { TourUpdateRow } from '@/lib/types/db-rows';
import { z } from 'zod';

const UpdateTourSchema = z.object({
  name: z.string().min(1, 'Название тура не может быть пустым').optional(),
  description: z.string().optional(),
  isActive: z.boolean().optional(),
  price: z.number({ coerce: true }).nonnegative('Цена не может быть отрицательной').optional(),
}).refine(
  data => data.name !== undefined || data.description !== undefined || data.isActive !== undefined || data.price !== undefined,
  'Необходимо указать хотя бы одно поле для обновления'
);

export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/content/tours/[id]
 * Обновление тура (модерация, активация/деактивация)
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) {
      return adminOrResponse;
    }
    const { id } = await context.params;
    const body = await request.json();
    const parsed = UpdateTourSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Некорректные данные'
      } as ApiResponse<null>, { status: 400 });
    }

    // Проверяем существование тура
    const checkQuery = 'SELECT id FROM tours WHERE id = $1';
    const checkResult = await query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Tour not found'
      } as ApiResponse<null>, { status: 404 });
    }

    // Строим динамический UPDATE
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (parsed.data.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(parsed.data.name);
      paramIndex++;
    }

    if (parsed.data.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(parsed.data.description);
      paramIndex++;
    }

    if (parsed.data.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(parsed.data.isActive);
      paramIndex++;
    }

    if (parsed.data.price !== undefined) {
      updates.push(`price = $${paramIndex}`);
      values.push(parsed.data.price);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No fields to update'
      } as ApiResponse<null>, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const updateQuery = `
      UPDATE tours
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, is_active, updated_at
    `;

    const result = await query<TourUpdateRow>(updateQuery, values);
    const updatedTour = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        id: updatedTour.id,
        name: updatedTour.name,
        isActive: updatedTour.is_active,
        updatedAt: new Date(updatedTour.updated_at)
      },
      message: 'Tour updated successfully'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to update tour',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * DELETE /api/admin/content/tours/[id]
 * Удаление тура (или архивация)
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) {
      return adminOrResponse;
    }
    const { id } = await context.params;

    // Проверяем существование
    const checkQuery = 'SELECT id FROM tours WHERE id = $1';
    const checkResult = await query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Tour not found'
      } as ApiResponse<null>, { status: 404 });
    }

    // Вместо удаления - деактивируем (мягкое удаление)
    const archiveQuery = `
      UPDATE tours
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `;

    await query(archiveQuery, [id]);

    return NextResponse.json({
      success: true,
      message: 'Tour archived successfully'
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to archive tour',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}



