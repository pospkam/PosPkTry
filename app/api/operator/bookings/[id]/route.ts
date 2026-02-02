import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/operator/bookings/[id]
 * Получение детальной информации о бронировании
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const operatorId = searchParams.get('operatorId');

    if (!operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Operator ID is required'
      } as ApiResponse<null>, { status: 400 });
    }

    const bookingQuery = `
      SELECT
        b.*,
        t.name as tour_name,
        t.operator_id,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone
      FROM bookings b
      JOIN tours t ON b.tour_id = t.id
      JOIN users u ON b.user_id = u.id
      WHERE b.id = $1 AND t.operator_id = $2
    `;

    const result = await query(bookingQuery, [id, operatorId]);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Booking not found'
      } as ApiResponse<null>, { status: 404 });
    }

    const row = result.rows[0];

    const booking = {
      id: row.id,
      tourId: row.tour_id,
      tourName: row.tour_name,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      userPhone: row.user_phone,
      date: new Date(row.start_date),
      guestsCount: parseInt(row.guests_count) || 1,
      totalPrice: parseFloat(row.total_price),
      status: row.status,
      paymentStatus: row.payment_status,
      notes: row.special_requirements,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };

    return NextResponse.json({
      success: true,
      data: booking
    });

  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch booking',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * PUT /api/operator/bookings/[id]
 * Обновление статуса бронирования (подтверждение/отмена)
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const operatorId = searchParams.get('operatorId');

    if (!operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Operator ID is required'
      } as ApiResponse<null>, { status: 400 });
    }

    const body = await request.json();

    // Проверка прав доступа
    const checkQuery = `
      SELECT b.id, b.status
      FROM bookings b
      JOIN tours t ON b.tour_id = t.id
      WHERE b.id = $1 AND t.operator_id = $2
    `;
    const checkResult = await query(checkQuery, [id, operatorId]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Booking not found or access denied'
      } as ApiResponse<null>, { status: 404 });
    }

    const currentStatus = checkResult.rows[0].status;

    // Валидация изменения статуса
    if (body.status) {
      const validTransitions: Record<string, string[]> = {
        pending: ['confirmed', 'cancelled'],
        confirmed: ['completed', 'cancelled'],
        completed: [],
        cancelled: []
      };

      if (!validTransitions[currentStatus]?.includes(body.status)) {
        return NextResponse.json({
          success: false,
          error: `Cannot change status from ${currentStatus} to ${body.status}`
        } as ApiResponse<null>, { status: 400 });
      }
    }

    // Обновление
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (body.status !== undefined) {
      updates.push(`status = $${paramIndex}`);
      values.push(body.status);
      paramIndex++;
    }

    if (body.notes !== undefined) {
      updates.push(`special_requirements = $${paramIndex}`);
      values.push(body.notes);
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
      UPDATE bookings
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, status, updated_at
    `;

    const result = await query(updateQuery, values);
    const updatedBooking = result.rows[0];

    // TODO: Отправить email уведомление клиенту

    return NextResponse.json({
      success: true,
      data: {
        id: updatedBooking.id,
        status: updatedBooking.status,
        updatedAt: new Date(updatedBooking.updated_at)
      },
      message: 'Booking updated successfully'
    });

  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update booking',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}



