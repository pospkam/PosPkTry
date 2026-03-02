import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireOperator } from '@/lib/auth/middleware';
import { verifyBookingOwnership } from '@/lib/auth/operator-helpers';

export const dynamic = 'force-dynamic';

/**
 * PUT /api/operator/bookings/[id]
 * Update booking status with ownership verification
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const operatorOrResponse = await requireOperator(request);
    if (operatorOrResponse instanceof NextResponse) {
      return operatorOrResponse;
    }
    const userId = operatorOrResponse.userId;

    const { id } = await params;

    // Verify ownership
    const isOwner = await verifyBookingOwnership(userId, id);
    
    if (!isOwner) {
      return NextResponse.json({
        success: false,
        error: 'Бронирование не найдено или у вас нет прав на его изменение'
      } as ApiResponse<null>, { status: 404 });
    }

    const body = await request.json();
    const { status, paymentStatus, notes } = body;

    // Validate status change
    const validStatuses = ['pending', 'confirmed', 'completed', 'cancelled'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({
        success: false,
        error: 'Неверный статус бронирования'
      } as ApiResponse<null>, { status: 400 });
    }

    const validPaymentStatuses = ['pending', 'paid', 'refunded'];
    if (paymentStatus && !validPaymentStatuses.includes(paymentStatus)) {
      return NextResponse.json({
        success: false,
        error: 'Неверный статус оплаты'
      } as ApiResponse<null>, { status: 400 });
    }

    // Build update query
    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    if (status) {
      updateFields.push(`status = $${paramIndex++}`);
      updateValues.push(status);
    }

    if (paymentStatus) {
      updateFields.push(`payment_status = $${paramIndex++}`);
      updateValues.push(paymentStatus);
    }

    if (notes !== undefined) {
      updateFields.push(`special_requests = $${paramIndex++}`);
      updateValues.push(notes);
    }

    if (updateFields.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Нет полей для обновления'
      } as ApiResponse<null>, { status: 400 });
    }

    updateValues.push(id);

    const result = await query(
      `UPDATE bookings 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      updateValues
    );

    // Create notification for status change
    if (status) {
      const booking = result.rows[0];
      await query(
        `INSERT INTO notifications (user_id, type, title, message, priority, action_url)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [
          booking.user_id,
          'booking_status_changed',
          'Статус бронирования изменён',
          `Статус вашего бронирования изменён на: ${status}`,
          status === 'cancelled' ? 'high' : 'normal',
          `/hub/tourist/bookings/${id}`
        ]
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Бронирование успешно обновлено'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Update booking error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при обновлении бронирования'
    } as ApiResponse<null>, { status: 500 });
  }
}
