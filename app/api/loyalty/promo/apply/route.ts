import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { loyaltySystem } from '@/lib/loyalty/loyalty-system';
import { requireAuth } from '@/lib/auth/middleware';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const ApplyPromoSchema = z.object({
  code: z.string().min(1, 'Промокод обязателен'),
  orderAmount: z.coerce.number().positive('Сумма заказа должна быть положительной'),
});

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
    const parsed = ApplyPromoSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      );
    }
    const { code, orderAmount } = parsed.data;

    const result = await loyaltySystem.applyPromoCode(code, userId, Number(orderAmount));

    return NextResponse.json({
      success: result.success,
      data: {
        discountAmount: result.discountAmount,
        message: result.message
      }
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка применения промокода'
    }, { status: 500 });
  }
}