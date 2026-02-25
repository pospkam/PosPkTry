import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/transfer/bookings
 * Get transfer bookings for operator
 */
// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'transfer') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    // Get operator's partner ID
    const partnerResult = await query(
      `SELECT id FROM partners WHERE category = 'transfer' 
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

    const operatorId = partnerResult.rows[0].id;

    // Note: Transfer bookings need a separate table in database
    // For now, return mock data structure
    const bookings = [];

    return NextResponse.json({
      success: true,
      data: { bookings },
      message: 'Система трансферов в разработке. Используйте основную систему бронирований.'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get transfer bookings error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении бронирований'
    } as ApiResponse<null>, { status: 500 });
  }
}
