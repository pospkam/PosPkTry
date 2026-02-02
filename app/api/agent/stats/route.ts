import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agent/stats
 * Get agent statistics and commissions
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'agent') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    // Get user info
    const userResult = await query(
      'SELECT name, email FROM users WHERE id = $1',
      [userId]
    );

    // Note: Need agent_id field in bookings to calculate real stats
    // For now, return mock structure
    const stats = {
      agent: {
        id: userId,
        name: userResult.rows[0].name,
        email: userResult.rows[0].email
      },
      bookings: {
        total: 0,
        thisMonth: 0,
        pending: 0,
        confirmed: 0,
        completed: 0
      },
      commissions: {
        total: 0,
        thisMonth: 0,
        pending: 0,
        paid: 0,
        rate: 15 // 15% commission rate
      },
      topTours: []
    };

    return NextResponse.json({
      success: true,
      data: stats,
      message: 'Система агентской статистики в разработке. Необходимо добавить поле agent_id в таблицу bookings.'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get agent stats error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении статистики'
    } as ApiResponse<null>, { status: 500 });
  }
}
