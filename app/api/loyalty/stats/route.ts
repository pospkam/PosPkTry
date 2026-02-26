import { NextRequest, NextResponse } from 'next/server';
import { loyaltySystem } from '@/lib/loyalty/loyalty-system';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// GET /api/loyalty/stats - Получение статистики лояльности пользователя
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.userId) {
      return NextResponse.json({
        success: false,
        error: 'Unauthorized'
      }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const requestedUserId = searchParams.get('userId');
    const userId = requestedUserId || auth.userId;

    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'User ID is required'
      }, { status: 400 });
    }

    if (requestedUserId && requestedUserId !== auth.userId && auth.role !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'User stats not found'
      }, { status: 404 });
    }

    const stats = await loyaltySystem.getUserLoyaltyStats(userId);

    return NextResponse.json({
      success: true,
      data: stats
    });

  } catch (error) {
    console.error('Loyalty stats error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка получения статистики лояльности'
    }, { status: 500 });
  }
}