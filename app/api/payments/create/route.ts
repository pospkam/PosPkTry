import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { classifyError } from '@/lib/errors/api-handler';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { verifyAuth } from '@/lib/auth';
import { BookingForPaymentRow, PaymentRow } from '@/lib/types/db-rows';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const CreatePaymentSchema = z.object({
  bookingId: z.string().min(1, 'ID бронирования обязателен'),
  bookingType: z.enum(['tour', 'accommodation', 'transfer'], { message: 'Тип бронирования должен быть tour, accommodation или transfer' }),
  amount: z.number().positive('Сумма должна быть положительной'),
  currency: z.string().default('RUB'),
  description: z.string().optional(),
  userEmail: z.string().email('Некорректный email').optional(),
});

/**
 * POST /api/payments/create
 * Создание платежа для бронирования
 */
const paymentLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  if (!paymentLimiter.check(ip)) {
    return NextResponse.json({
      success: false,
      error: 'Слишком много запросов оплаты. Попробуйте позже.',
    } as ApiResponse<null>, { status: 429 });
  }

  try {
    const auth = await verifyAuth(request);
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized',
      } as ApiResponse<null>, { status: 401 });
    }

    const body = await request.json();
    const parsed = CreatePaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Некорректные данные'
      } as ApiResponse<null>, { status: 400 });
    }

    const { bookingId, bookingType, amount, currency, description, userEmail: bodyEmail } = parsed.data;
    const userId = auth.userId;
    const userEmail = auth.email || bodyEmail || '';

    // Проверяем существование бронирования
    let bookingQuery = '';
    switch (bookingType) {
      case 'tour':
        bookingQuery = 'SELECT id, total_price, status, user_id FROM bookings WHERE id = $1';
        break;
      case 'accommodation':
        bookingQuery = 'SELECT id, total_price, status, user_id FROM accommodation_bookings WHERE id = $1';
        break;
      case 'transfer':
        bookingQuery = 'SELECT id, total_price, status, user_id FROM transfer_bookings WHERE id = $1';
        break;
    }

    const bookingResult = await query<BookingForPaymentRow>(bookingQuery, [bookingId]);

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
    if (parseFloat(booking.total_price) !== amount) {
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

    const paymentResult = await query<PaymentRow>(paymentQuery, [
      bookingId,
      bookingType,
      userId,
      amount,
      currency,
      'pending',
      'cloudpayments'
    ]);

    const payment = paymentResult.rows[0];

    // Возвращаем данные для CloudPayments widget
    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id,
        amount,
        currency,
        description: description || `Оплата бронирования #${bookingId.substring(0, 8)}`,
        invoiceId: payment.id,
        accountId: userId,
        email: userEmail,
        status: payment.status,
        createdAt: new Date(payment.created_at)
      }
    });

  } catch (error) {
    const { message, status } = classifyError(error);
    return NextResponse.json({ success: false, error: message } as ApiResponse<null>, { status });
  }
}



