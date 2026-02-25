import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireTransferOperator } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/transfer/stats
 * Get transfer operator statistics
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireTransferOperator(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult.userId;

    // Get operator's partner info
    const partnerResult = await query(
      `SELECT id, name, rating, review_count FROM partners 
       WHERE category = 'transfer' 
       AND contact->>'email' = (SELECT email FROM users WHERE id = $1)
       LIMIT 1`,
      [userId]
    );

    if (partnerResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Партнёр не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const operator = partnerResult.rows[0];

    // Mock stats - implement real stats when transfer system is complete
    const stats = {
      operator: {
        id: operator.id,
        name: operator.name,
        rating: parseFloat(operator.rating),
        reviewCount: operator.review_count
      },
      vehicles: {
        total: 2,
        available: 2,
        busy: 0
      },
      bookings: {
        total: 0,
        pending: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0
      },
      revenue: {
        total: 0,
        monthly: 0,
        pending: 0
      }
    };

    return NextResponse.json({
      success: true,
      data: stats,
      message: 'Статистика трансферов в разработке'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get transfer stats error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении статистики'
    } as ApiResponse<null>, { status: 500 });
  }
}
