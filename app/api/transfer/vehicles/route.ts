import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/transfer/vehicles
 * Get transfer operator's vehicles
 */
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
      `SELECT id, name FROM partners WHERE category = 'transfer' 
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

    // For now, return mock data - implement real vehicle management later
    const vehicles = [
      {
        id: '1',
        type: 'sedan',
        model: 'Toyota Camry',
        capacity: 4,
        available: true
      },
      {
        id: '2',
        type: 'minivan',
        model: 'Mercedes Vito',
        capacity: 8,
        available: true
      }
    ];

    return NextResponse.json({
      success: true,
      data: { vehicles, operatorId: partnerResult.rows[0].id }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get vehicles error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении транспорта'
    } as ApiResponse<null>, { status: 500 });
  }
}
