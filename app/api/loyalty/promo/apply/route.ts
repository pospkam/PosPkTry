import { NextRequest, NextResponse } from 'next/server';
import { loyaltySystem } from '@/lib/loyalty/loyalty-system';

export const dynamic = 'force-dynamic';

// POST /api/loyalty/promo/apply - Применение промокода
// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, userId, orderAmount } = body;

    if (!code || !userId || !orderAmount) {
      return NextResponse.json({
        success: false,
        error: 'Code, userId and orderAmount are required'
      }, { status: 400 });
    }

    const result = await loyaltySystem.applyPromoCode(code, userId, orderAmount);

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