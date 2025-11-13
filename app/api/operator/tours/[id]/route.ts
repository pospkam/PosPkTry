import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/operator/tours/[id]
 * Get specific tour (with owner check)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'operator') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    // Get operator's partner ID
    const partnerResult = await query(
      `SELECT id FROM partners WHERE category = 'operator' 
       AND contact->>'email' = (SELECT email FROM users WHERE id = $1)
       LIMIT 1`,
      [userId]
    );

    if (partnerResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Партнёр не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const operatorId = partnerResult.rows[0].id;

    // Get tour with owner verification
    const result = await query(
      `SELECT t.*,
        array_agg(DISTINCT a.url) as images
       FROM tours t
       LEFT JOIN tour_assets ta ON t.id = ta.tour_id
       LEFT JOIN assets a ON ta.asset_id = a.id
       WHERE t.id = $1 AND t.operator_id = $2
       GROUP BY t.id`,
      [params.id, operatorId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Тур не найден или у вас нет прав на его просмотр'
      } as ApiResponse<null>, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get tour error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении тура'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * PATCH /api/operator/tours/[id]
 * Update tour (with owner check)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'operator') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    // Get operator's partner ID
    const partnerResult = await query(
      `SELECT id FROM partners WHERE category = 'operator' 
       AND contact->>'email' = (SELECT email FROM users WHERE id = $1)
       LIMIT 1`,
      [userId]
    );

    if (partnerResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Партнёр не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const operatorId = partnerResult.rows[0].id;

    // Verify ownership
    const checkResult = await query(
      'SELECT id FROM tours WHERE id = $1 AND operator_id = $2',
      [params.id, operatorId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Тур не найден или у вас нет прав на его редактирование'
      } as ApiResponse<null>, { status: 404 });
    }

    const body = await request.json();

    // Build dynamic update query
    const allowedFields = [
      'name', 'description', 'short_description', 'difficulty', 'duration', 
      'price', 'season', 'max_group_size', 'min_group_size', 
      'requirements', 'included', 'not_included', 'is_active'
    ];

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        updateFields.push(`${dbKey} = $${paramIndex++}`);
        
        // Handle JSON fields
        if (['season', 'requirements', 'included', 'not_included'].includes(key)) {
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

    updateValues.push(params.id, operatorId);

    const result = await query(
      `UPDATE tours 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex++} AND operator_id = $${paramIndex++}
       RETURNING *`,
      updateValues
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Тур обновлён успешно'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Update tour error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при обновлении тура'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * DELETE /api/operator/tours/[id]
 * Delete tour (with owner check)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'operator') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    // Get operator's partner ID
    const partnerResult = await query(
      `SELECT id FROM partners WHERE category = 'operator' 
       AND contact->>'email' = (SELECT email FROM users WHERE id = $1)
       LIMIT 1`,
      [userId]
    );

    if (partnerResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Партнёр не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const operatorId = partnerResult.rows[0].id;

    // Check for existing bookings
    const bookingsCheck = await query(
      `SELECT COUNT(*) as count FROM bookings 
       WHERE tour_id = $1 AND status IN ('pending', 'confirmed')`,
      [params.id]
    );

    if (parseInt(bookingsCheck.rows[0].count) > 0) {
      return NextResponse.json({
        success: false,
        error: 'Невозможно удалить тур с активными бронированиями. Деактивируйте тур вместо удаления.'
      } as ApiResponse<null>, { status: 400 });
    }

    // Delete tour (with owner verification)
    const result = await query(
      'DELETE FROM tours WHERE id = $1 AND operator_id = $2 RETURNING id',
      [params.id, operatorId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Тур не найден или у вас нет прав на его удаление'
      } as ApiResponse<null>, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: 'Тур удалён успешно'
    } as ApiResponse<null>);

  } catch (error) {
    console.error('Delete tour error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при удалении тура'
    } as ApiResponse<null>, { status: 500 });
  }
}
