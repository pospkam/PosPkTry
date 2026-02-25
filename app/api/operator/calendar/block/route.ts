import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireOperator } from '@/lib/auth/middleware';
import { verifyTourOwnership } from '@/lib/auth/operator-helpers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/operator/calendar/block
 * Block date range for a tour
 */
export async function POST(request: NextRequest) {
  try {
    const operatorOrResponse = await requireOperator(request);
    if (operatorOrResponse instanceof NextResponse) {
      return operatorOrResponse;
    }
    const userId = operatorOrResponse.userId;

    const body = await request.json();
    const { tourId, startDate, endDate, reason } = body;

    if (!tourId || !startDate || !endDate) {
      return NextResponse.json({
        success: false,
        error: 'tourId, startDate и endDate обязательны'
      } as ApiResponse<null>, { status: 400 });
    }

    // Verify tour ownership
    const isOwner = await verifyTourOwnership(userId, tourId);
    
    if (!isOwner) {
      return NextResponse.json({
        success: false,
        error: 'Тур не найден или у вас нет прав'
      } as ApiResponse<null>, { status: 404 });
    }

    // Generate dates array
    const start = new Date(startDate);
    const end = new Date(endDate);
    const dates: string[] = [];
    
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      dates.push(d.toISOString().split('T')[0]);
    }

    // Block each date
    const promises = dates.map(date => 
      query(
        `INSERT INTO tour_availability (tour_id, date, available_spots, is_blocked, block_reason)
         VALUES ($1, $2, 0, true, $3)
         ON CONFLICT (tour_id, date) DO UPDATE SET
           is_blocked = true,
           block_reason = EXCLUDED.block_reason`,
        [tourId, date, reason || 'Заблокировано оператором']
      )
    );

    await Promise.all(promises);

    return NextResponse.json({
      success: true,
      data: {
        blockedDates: dates.length,
        dates
      },
      message: `Заблокировано ${dates.length} дат`
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Block dates error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при блокировке дат'
    } as ApiResponse<null>, { status: 500 });
  }
}
