import { NextRequest, NextResponse } from 'next/server';
import { loyaltySystem } from '@/lib/loyalty/loyalty-system';
import { requireAuth } from '@/lib/auth/middleware';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const promoLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

// POST /api/loyalty/promo/apply - Применение промокода
export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  if (!promoLimiter.check(ip)) {
    return NextResponse.json(
      { success: false, error: 'Слишком много попыток. Попробуйте позже.' },
      { status: 429 }
    );
  }

  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult.userId;

    const body = await request.json();
    const { code, orderAmount } = body;

    if (!code || orderAmount == null) {
      return NextResponse.json({
        success: false,
        error: 'Code and orderAmount are required'
      }, { status: 400 });
    }

    const result = await loyaltySystem.applyPromoCode(code, userId, Number(orderAmount));

    return NextResponse.json({
      success: result.success,
      data: {
        discountAmount: result.discountAmount,
        message: result.message
      }
    });

  } catch (error) {
    console.error('Promo code application error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка применения промокода'
    }, { status: 500 });
  }
}