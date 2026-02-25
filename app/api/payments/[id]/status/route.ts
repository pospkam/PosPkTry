import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/payments/[id]/status
 * Проверка статуса платежа
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      } as ApiResponse<null>, { status: 401 });
    }

    const { id } = await context.params;

    const paymentQuery = `
      SELECT
        id,
        booking_id,
        booking_type,
        amount,
        currency,
        status,
        payment_method,
        transaction_id,
        failure_reason,
        user_id,
        created_at,
        completed_at
      FROM payments
      WHERE id = $1
    `;

    const result = await query(paymentQuery, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Payment not found'
      } as ApiResponse<null>, { status: 404 });
    }

    const payment = result.rows[0];
    const isAdmin = auth.role === 'admin';
    const isPaymentOwner = payment.user_id === auth.userId;
    let isOperatorOwner = false;

    if (!isAdmin && !isPaymentOwner && auth.role === 'operator' && payment.booking_type === 'tour') {
      const operatorAccessResult = await query(
        `SELECT b.id
         FROM bookings b
         JOIN tours t ON b.tour_id = t.id
         JOIN partners p ON t.operator_id = p.id
         WHERE b.id = $1 AND p.user_id = $2
         LIMIT 1`,
        [payment.booking_id, auth.userId]
      );
      isOperatorOwner = operatorAccessResult.rows.length > 0;
    }

    if (!isAdmin && !isPaymentOwner && !isOperatorOwner) {
      return NextResponse.json({
        success: false,
        error: 'Payment not found'
      } as ApiResponse<null>, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        id: payment.id,
        bookingId: payment.booking_id,
        bookingType: payment.booking_type,
        amount: parseFloat(payment.amount),
        currency: payment.currency,
        status: payment.status,
        paymentMethod: payment.payment_method,
        transactionId: payment.transaction_id,
        failureReason: payment.failure_reason,
        createdAt: new Date(payment.created_at),
        completedAt: payment.completed_at ? new Date(payment.completed_at) : null
      }
    });

  } catch (error) {
    console.error('Error fetching payment status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch payment status',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}



