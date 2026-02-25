import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/admin/content/tours/[id]
 * Обновление тура (модерация, активация/деактивация)
 */
// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();

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
    const values: any[] = [];
    let paramIndex = 1;

    if (body.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(body.name);
      paramIndex++;
    }

    if (body.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(body.description);
      paramIndex++;
    }

    if (body.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(body.isActive);
      paramIndex++;
    }

    if (body.price !== undefined) {
      updates.push(`price = $${paramIndex}`);
      values.push(body.price);
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

    const result = await query(updateQuery, values);
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
    console.error('Error updating tour:', error);
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
    console.error('Error archiving tour:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to archive tour',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}



