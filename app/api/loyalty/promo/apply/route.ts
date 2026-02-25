import { NextRequest, NextResponse } from 'next/server';
import { loyaltySystem } from '@/lib/loyalty/loyalty-system';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

// POST /api/loyalty/promo/apply - Применение промокода
export async function POST(request: NextRequest) {
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