import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types';
import { getGearStats } from '@/lib/auth/gear-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/gear/stats - Get comprehensive gear partner statistics
 */
// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    
    if (!userId) {
      return NextResponse.json({
        success: false,
        error: 'Требуется авторизация'
      } as ApiResponse<null>, { status: 401 });
    }

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
