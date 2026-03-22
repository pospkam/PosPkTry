import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { transferPayments } from '@/lib/payments/transfer-payments';
import { requireAuth } from '@/lib/auth/middleware';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const transferPaymentLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

const confirmPaymentSchema = z.object({
  paymentId: z.string().uuid(),
});

// POST /api/transfers/payment/confirm - Подтверждение платежа
export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  if (!transferPaymentLimiter.check(ip)) {
    return NextResponse.json(
      { success: false, error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429 }
    );
  }

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const body = await request.json();
    const parsed = confirmPaymentSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Некорректные данные'
      }, { status: 400 });
    }

    const { paymentId } = parsed.data;

    // Подтверждаем платеж
    const result = await transferPayments.confirmPayment(paymentId);

    if (result.success) {
      return NextResponse.json({
        success: true,
        data: {
          paymentId: result.paymentId,
          status: result.status,
          message: 'Платеж успешно подтвержден'
        }
      });
    } else {
      return NextResponse.json({
        success: false,
        error: result.error || 'Ошибка подтверждения платежа'
      }, { status: 400 });
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}

// GET /api/transfers/payment/confirm - Проверка статуса платежа
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;

    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('paymentId');

    if (!paymentId) {
      return NextResponse.json({
        success: false,
        error: 'Payment ID is required'
      }, { status: 400 });
    }

    // Получаем информацию о платеже
    const payment = await transferPayments.getPaymentById(paymentId);

    if (!payment) {
      return NextResponse.json({
        success: false,
        error: 'Платеж не найден'
      }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: {
        paymentId: payment.id,
        status: payment.status,
        amount: payment.amount,
        currency: payment.currency,
        createdAt: payment.created_at,
        processedAt: payment.processed_at
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}