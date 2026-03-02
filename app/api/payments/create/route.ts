import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface CreatePaymentRequest {
  bookingId: string;
  bookingType: 'tour' | 'accommodation' | 'transfer';
  amount: number;
  currency: string;
  description?: string;
  userEmail?: string;
}

/**
 * POST /api/payments/create
 * Создание платежа для бронирования
 */
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
      } as ApiResponse<null>, { status: 401 });
    }

    const body: CreatePaymentRequest = await request.json();
    const userId = auth.userId;
    const userEmail = auth.email || body.userEmail || '';

    // Валидация
    if (!body.bookingId || !body.amount) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields'
      } as ApiResponse<null>, { status: 400 });
    }

    // Проверяем существование бронирования
    let bookingQuery = '';
    switch (body.bookingType) {
      case 'tour':
        bookingQuery = 'SELECT id, total_price, status, user_id FROM bookings WHERE id = $1';
        break;
      case 'accommodation':
        bookingQuery = 'SELECT id, total_price, status, user_id FROM accommodation_bookings WHERE id = $1';
        break;
      case 'transfer':
        bookingQuery = 'SELECT id, total_price, status, user_id FROM transfer_bookings WHERE id = $1';
        break;
      default:
        return NextResponse.json({
          success: false,
          error: 'Invalid booking type'
        } as ApiResponse<null>, { status: 400 });
    }

    const bookingResult = await query(bookingQuery, [body.bookingId]);

    if (bookingResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Booking not found'
      } as ApiResponse<null>, { status: 404 });
    }

    const booking = bookingResult.rows[0];

    // Проверяем ownership (или admin доступ)
    if (auth.role !== 'admin' && booking.user_id !== userId) {
      return NextResponse.json({
        success: false,
        error: 'Booking not found',
      } as ApiResponse<null>, { status: 404 });
    }

    // Проверяем, что сумма совпадает
    if (parseFloat(booking.total_price) !== body.amount) {
      return NextResponse.json({
        success: false,
        error: 'Amount mismatch'
      } as ApiResponse<null>, { status: 400 });
    }

    // Создаём запись о платеже
    const paymentQuery = `
      INSERT INTO payments (
        booking_id,
        booking_type,
        user_id,
        amount,
        currency,
        status,
        payment_method,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      RETURNING id, status, created_at
    `;

    const paymentResult = await query(paymentQuery, [
      body.bookingId,
      body.bookingType,
      userId,
      body.amount,
      body.currency || 'RUB',
      'pending',
      'cloudpayments'
    ]);

    const payment = paymentResult.rows[0];

    // Возвращаем данные для CloudPayments widget
    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id,
        amount: body.amount,
        currency: body.currency || 'RUB',
        description: body.description || `Оплата бронирования #${body.bookingId.substring(0, 8)}`,
        invoiceId: payment.id,
        accountId: userId,
        email: userEmail,
        status: payment.status,
        createdAt: new Date(payment.created_at)
      }
    });

  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create payment',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}



