import { NextRequest, NextResponse } from 'next/server';
import { transferPayments } from '@/lib/payments/transfer-payments';

export const dynamic = 'force-dynamic';

// POST /api/transfers/payment/confirm - Подтверждение платежа
// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { paymentId } = body;

    if (!paymentId) {
      return NextResponse.json({
        success: false,
        error: 'Payment ID is required'
      }, { status: 400 });
    }

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
    console.error('Payment confirmation error:', error);
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}

// GET /api/transfers/payment/confirm - Проверка статуса платежа
export async function GET(request: NextRequest) {
  try {
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
    console.error('Payment status check error:', error);
    return NextResponse.json({
      success: false,
      error: 'Внутренняя ошибка сервера'
    }, { status: 500 });
  }
}