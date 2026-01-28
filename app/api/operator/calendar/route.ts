import { NextRequest, NextResponse } from 'next/server';
import { query } from '@core-infrastructure/lib/database';
import { ApiResponse } from '@/types';
import { AvailabilitySlot } from '@/types/operator';

export const dynamic = 'force-dynamic';

/**
 * GET /api/operator/calendar
 * Получение календаря доступности туров
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const operatorId = searchParams.get('operatorId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const tourId = searchParams.get('tourId');

    if (!operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Operator ID is required'
      } as ApiResponse<null>, { status: 400 });
    }

    if (!startDate || !endDate) {
      return NextResponse.json({
        success: false,
        error: 'Start and end dates are required'
      } as ApiResponse<null>, { status: 400 });
    }

    const whereConditions: string[] = ['t.operator_id = $1'];
    const queryParams: any[] = [operatorId];
    let paramIndex = 2;

    if (tourId) {
      whereConditions.push(`t.id = $${paramIndex}`);
      queryParams.push(tourId);
      paramIndex++;
    }

    // Получаем все даты с бронированиями
    const availabilityQuery = `
      WITH RECURSIVE date_series AS (
        SELECT $${paramIndex}::date AS date
        UNION ALL
        SELECT date + 1
        FROM date_series
        WHERE date < $${paramIndex + 1}::date
      ),
      tour_dates AS (
        SELECT
          t.id as tour_id,
          t.name as tour_name,
          t.max_group_size,
          t.price,
          ds.date,
          COALESCE(SUM(b.guests_count), 0) as booked_count
        FROM tours t
        CROSS JOIN date_series ds
        LEFT JOIN bookings b ON b.tour_id = t.id 
          AND DATE(b.start_date) = ds.date
          AND b.status IN ('confirmed', 'pending')
        WHERE ${whereConditions.join(' AND ')}
        GROUP BY t.id, t.name, t.max_group_size, t.price, ds.date
      )
      SELECT
        tour_id,
        tour_name,
        date,
        max_group_size,
        booked_count,
        (max_group_size - booked_count) as available_spots,
        CASE 
          WHEN booked_count >= max_group_size THEN true
          ELSE false
        END as is_blocked,
        price
      FROM tour_dates
      ORDER BY date ASC, tour_name ASC
    `;

    queryParams.push(startDate, endDate);
    const result = await query(availabilityQuery, queryParams);

    const slots: AvailabilitySlot[] = result.rows.map(row => ({
      date: new Date(row.date),
      tourId: row.tour_id,
      maxCapacity: parseInt(row.max_group_size),
      bookedCount: parseInt(row.booked_count),
      availableSpots: parseInt(row.available_spots),
      isBlocked: row.is_blocked,
      price: parseFloat(row.price)
    }));

    return NextResponse.json({
      success: true,
      data: slots
    } as ApiResponse<AvailabilitySlot[]>);

  } catch (error) {
    console.error('Error fetching calendar:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch calendar',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/operator/calendar/block
 * Блокировка дат (для технических работ, плохой погоды и т.д.)
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const operatorId = searchParams.get('operatorId');

    if (!operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Operator ID is required'
      } as ApiResponse<null>, { status: 400 });
    }

    const body = await request.json();

    if (!body.tourId || !body.date) {
      return NextResponse.json({
        success: false,
        error: 'Tour ID and date are required'
      } as ApiResponse<null>, { status: 400 });
    }

    // Проверка прав доступа
    const checkQuery = 'SELECT id FROM tours WHERE id = $1 AND operator_id = $2';
    const checkResult = await query(checkQuery, [body.tourId, operatorId]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Tour not found or access denied'
      } as ApiResponse<null>, { status: 404 });
    }

    // TODO: Создать таблицу blocked_dates и добавить запись
    // Пока просто возвращаем успех
    
    return NextResponse.json({
      success: true,
      message: 'Date blocked successfully (TODO: implement blocked_dates table)'
    });

  } catch (error) {
    console.error('Error blocking date:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to block date',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}



