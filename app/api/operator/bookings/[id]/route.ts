import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireOperator } from '@/lib/auth/middleware';
import { getOperatorPartnerId } from '@/lib/auth/operator-helpers';
import { z } from 'zod';

const UpdateBookingSchema = z.object({
  status: z.enum(['pending', 'confirmed', 'completed', 'cancelled'], { message: 'Неверный статус бронирования' }).optional(),
  paymentStatus: z.enum(['pending', 'paid', 'refunded'], { message: 'Неверный статус оплаты' }).optional(),
  notes: z.string().optional(),
}).refine(
  (data) => data.status !== undefined || data.paymentStatus !== undefined || data.notes !== undefined,
  { message: 'Укажите хотя бы одно поле для обновления' }
);

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
    const operatorId = await getOperatorPartnerId(userId);
    if (!operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Партнёрский профиль оператора не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const { id } = await params;

    const body = await request.json();
    const parsed = UpdateBookingSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' }, { status: 400 });
    }
    const { status, paymentStatus, notes } = parsed.data;

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

    const bookingIdParamIndex = paramIndex++;
    const operatorIdParamIndex = paramIndex;
    updateValues.push(id);
    updateValues.push(operatorId);

    const result = await query(
      `UPDATE bookings 
       SET ${updateFields.join(', ')}
       FROM tours t
       WHERE bookings.id = $${bookingIdParamIndex}
         AND bookings.tour_id = t.id
         AND t.operator_id = $${operatorIdParamIndex}
       RETURNING *`,
      updateValues
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Бронирование не найдено'
      } as ApiResponse<null>, { status: 404 });
    }

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
    } as ApiResponse<unknown>);

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка при обновлении бронирования'
    } as ApiResponse<null>, { status: 500 });
  }
}
