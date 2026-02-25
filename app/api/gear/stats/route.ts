import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types';
import { getGearStats } from '@/lib/auth/gear-helpers';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/gear/stats - Get comprehensive gear partner statistics (auth required)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult.userId;

    const stats = await getGearStats(userId);

    if (!stats) {
      return NextResponse.json({
        success: false,
        error: 'Статистика не найдена'
      } as ApiResponse<null>, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: stats
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get gear stats error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении статистики'
    } as ApiResponse<null>, { status: 500 });
  }
}
