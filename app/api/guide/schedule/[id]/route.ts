import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/guide/schedule/[id]
 * Update schedule entry (with owner check)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'guide') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    // Verify ownership
    const checkResult = await query(
      'SELECT id, status FROM guide_schedule WHERE id = $1 AND guide_id = $2',
      [params.id, userId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Расписание не найдено'
      } as ApiResponse<null>, { status: 404 });
    }

    const body = await request.json();

    // Build update query
    const allowedFields = [
      'status', 'meeting_point', 'participants_count', 'max_participants',
      'weather_conditions', 'safety_notes', 'special_requirements'
    ];

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        updateFields.push(`${dbKey} = $${paramIndex++}`);
        
        // Handle JSON fields
        if (key === 'weatherConditions') {
          updateValues.push(JSON.stringify(value));
        } else {
          updateValues.push(value);
        }
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Нет полей для обновления'
      } as ApiResponse<null>, { status: 400 });
    }

    updateValues.push(params.id, userId);

    const result = await query(
      `UPDATE guide_schedule 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex++} AND guide_id = $${paramIndex++}
       RETURNING *`,
      updateValues
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Расписание обновлено'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Update schedule error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при обновлении расписания'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * DELETE /api/guide/schedule/[id]
 * Delete schedule entry (with owner check)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'guide') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    // Check if has groups
    const groupsCheck = await query(
      'SELECT id FROM guide_groups WHERE schedule_id = $1',
      [params.id]
    );

    if (groupsCheck.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Невозможно удалить расписание с группами. Отмените его вместо удаления.'
      } as ApiResponse<null>, { status: 400 });
    }

    // Delete (with owner verification)
    const result = await query(
      'DELETE FROM guide_schedule WHERE id = $1 AND guide_id = $2 RETURNING id',
      [params.id, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Расписание не найдено'
      } as ApiResponse<null>, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Расписание удалено'
    } as ApiResponse<null>);

  } catch (error) {
    console.error('Delete schedule error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при удалении расписания'
    } as ApiResponse<null>, { status: 500 });
  }
}
