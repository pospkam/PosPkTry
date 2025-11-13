import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/operator/bookings/[id]
 * Update booking status (confirm/complete with owner check)
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

    // Verify ownership through tour
    const checkResult = await query(
      `SELECT b.id, b.status FROM bookings b
       JOIN tours t ON b.tour_id = t.id
       WHERE b.id = $1 AND t.operator_id = $2`,
      [params.id, operatorId]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Бронирование не найдено или у вас нет прав на его изменение'
      } as ApiResponse<null>, { status: 404 });
    }

    const body = await request.json();
    const { status, paymentStatus } = body;

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

    if (updateFields.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Нет полей для обновления'
      } as ApiResponse<null>, { status: 400 });
    }

    updateValues.push(params.id);

    const result = await query(
      `UPDATE bookings 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex++}
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
