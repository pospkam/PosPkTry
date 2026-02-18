import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/notifications/[id]
 * Mark notification as read
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Не авторизован'
      } as ApiResponse<null>, { status: 401 });
    }

    const body = await request.json();
    const { isRead, isArchived } = body;

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (isRead !== undefined) {
      updateFields.push(`is_read = $${paramIndex++}`);
      updateValues.push(isRead);
      
      if (isRead) {
        updateFields.push(`read_at = NOW()`);
      }
    }

    if (isArchived !== undefined) {
      updateFields.push(`is_archived = $${paramIndex++}`);
      updateValues.push(isArchived);
    }

    if (updateFields.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Нет полей для обновления'
      } as ApiResponse<null>, { status: 400 });
    }

    updateValues.push(params.id, userId);

    const result = await query(
      `UPDATE notifications 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
       RETURNING *`,
      updateValues
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Уведомление не найдено'
      } as ApiResponse<null>, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Update notification error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при обновлении уведомления'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * DELETE /api/notifications/[id]
 * Delete notification
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Не авторизован'
      } as ApiResponse<null>, { status: 401 });
    }

    const result = await query(
      'DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id',
      [params.id, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Уведомление не найдено'
      } as ApiResponse<null>, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Уведомление удалено'
    } as ApiResponse<null>);

  } catch (error) {
    console.error('Delete notification error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при удалении уведомления'
    } as ApiResponse<null>, { status: 500 });
  }
}
