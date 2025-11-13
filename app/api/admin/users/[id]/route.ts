import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users/[id]
 * Get user details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    const result = await query(
      'SELECT id, email, name, role, preferences, created_at, updated_at FROM users WHERE id = $1',
      [params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Пользователь не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении пользователя'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * PATCH /api/admin/users/[id]
 * Update user
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    const body = await request.json();
    const { name, role, preferences } = body;

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (name) {
      updateFields.push(`name = $${paramIndex++}`);
      updateValues.push(name);
    }

    if (role) {
      updateFields.push(`role = $${paramIndex++}`);
      updateValues.push(role);
    }

    if (preferences) {
      updateFields.push(`preferences = $${paramIndex++}`);
      updateValues.push(JSON.stringify(preferences));
    }

    if (updateFields.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Нет полей для обновления'
      } as ApiResponse<null>, { status: 400 });
    }

    updateValues.push(params.id);

    const result = await query(
      `UPDATE users 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex++}
       RETURNING *`,
      updateValues
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Пользователь обновлён'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при обновлении пользователя'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Delete user
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    // Prevent self-deletion
    if (userId === params.id) {
      return NextResponse.json({
        success: false,
        error: 'Невозможно удалить собственный аккаунт'
      } as ApiResponse<null>, { status: 400 });
    }

    const result = await query(
      'DELETE FROM users WHERE id = $1 RETURNING id',
      [params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Пользователь не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Пользователь удалён'
    } as ApiResponse<null>);

  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при удалении пользователя'
    } as ApiResponse<null>, { status: 500 });
  }
}
