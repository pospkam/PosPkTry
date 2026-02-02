import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bookings/[id]
 * Get specific booking details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
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
      `SELECT 
        b.*,
        t.name as tour_name,
        t.description as tour_description,
        t.difficulty as tour_difficulty,
        t.duration as tour_duration,
        t.price as tour_price,
        array_agg(DISTINCT a.url) as tour_images,
        p.name as operator_name,
        p.contact as operator_contact
       FROM bookings b
       JOIN tours t ON b.tour_id = t.id
       LEFT JOIN partners p ON t.operator_id = p.id
       LEFT JOIN tour_assets ta ON t.id = ta.tour_id
       LEFT JOIN assets a ON ta.asset_id = a.id
       WHERE b.id = $1 AND b.user_id = $2
       GROUP BY b.id, t.id, p.id`,
      [params.id, userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Бронирование не найдено'
      } as ApiResponse<null>, { status: 404 });
    }

    const row = result.rows[0];
    const booking = {
      id: row.id,
      tourId: row.tour_id,
      date: row.date,
      participants: row.participants,
      totalPrice: row.total_price,
      status: row.status,
      paymentStatus: row.payment_status,
      specialRequests: row.special_requests,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      tour: {
        name: row.tour_name,
        description: row.tour_description,
        difficulty: row.tour_difficulty,
        duration: row.tour_duration,
        price: row.tour_price,
        images: row.tour_images.filter(Boolean)
      },
      operator: {
        name: row.operator_name,
        contact: row.operator_contact
      }
    };

    return NextResponse.json({
      success: true,
      data: booking
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get booking error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении бронирования'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * PATCH /api/bookings/[id]
 * Update booking (cancel)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
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
    const { status, specialRequests } = body;

    // Verify booking belongs to user
    const checkResult = await query(
      'SELECT id, status FROM bookings WHERE id = $1 AND user_id = $2',
      [params.id, userId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Бронирование не найдено'
      } as ApiResponse<null>, { status: 404 });
    }

    // Validate status change
    const validStatuses = ['pending', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({
        success: false,
        error: 'Неверный статус бронирования'
      } as ApiResponse<null>, { status: 400 });
    }

    // Update booking
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (status) {
      updateFields.push(`status = $${paramIndex++}`);
      updateValues.push(status);
    }

    if (specialRequests !== undefined) {
      updateFields.push(`special_requests = $${paramIndex++}`);
      updateValues.push(specialRequests);
    }

    if (updateFields.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Нет полей для обновления'
      } as ApiResponse<null>, { status: 400 });
    }

    updateValues.push(params.id, userId);

    const result = await query(
      `UPDATE bookings 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex++} AND user_id = $${paramIndex++}
       RETURNING *`,
      updateValues
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Бронирование обновлено'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Update booking error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при обновлении бронирования'
    } as ApiResponse<null>, { status: 500 });
  }
}
