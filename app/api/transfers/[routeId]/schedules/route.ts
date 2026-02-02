import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

interface TimeSlot {
  time: string; // HH:MM
  available: number;
  price: number;
}

/**
 * GET /api/transfers/[routeId]/schedules
 * Получить расписание рейсов для маршрута на определённую дату
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ routeId: string }> }
) {
  try {
    const { routeId } = await context.params;
    const { searchParams } = new URL(request.url);
    
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({
        success: false,
        error: 'Date is required'
      } as ApiResponse<null>, { status: 400 });
    }

    // Проверяем существование маршрута
    const routeQuery = `
      SELECT id, from_location, to_location, base_price, is_active
      FROM routes
      WHERE id = $1
    `;
    const routeResult = await query(routeQuery, [routeId]);

    if (routeResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Route not found'
      } as ApiResponse<null>, { status: 404 });
    }

    const route = routeResult.rows[0];

    if (!route.is_active) {
      return NextResponse.json({
        success: false,
        error: 'Route is not active'
      } as ApiResponse<null>, { status: 400 });
    }

    // Получаем расписание на дату
    const schedulesQuery = `
      SELECT
        ts.id,
        ts.departure_time::text as time,
        ts.total_seats,
        ts.price,
        COALESCE(SUM(CASE WHEN tb.status IN ('confirmed', 'pending') THEN tb.seats_count ELSE 0 END), 0) as booked_seats
      FROM transfer_schedules ts
      LEFT JOIN transfers tr ON tr.schedule_id = ts.id AND DATE(tr.departure_date) = $1::date
      LEFT JOIN transfer_bookings tb ON tb.transfer_id = tr.id AND tb.status IN ('confirmed', 'pending')
      WHERE ts.route_id = $2
        AND ts.is_active = true
      GROUP BY ts.id, ts.departure_time, ts.total_seats, ts.price
      ORDER BY ts.departure_time
    `;

    const schedulesResult = await query(schedulesQuery, [date, routeId]);

    const schedules: TimeSlot[] = schedulesResult.rows.map(row => ({
      time: row.time.substring(0, 5), // Преобразуем HH:MM:SS в HH:MM
      available: Math.max(0, parseInt(row.total_seats) - parseInt(row.booked_seats)),
      price: parseFloat(row.price)
    }));

    // Если нет расписания, создаём стандартное на основе маршрута
    if (schedules.length === 0) {
      const defaultTimes = ['08:00', '10:00', '14:00', '16:00', '18:00'];
      return NextResponse.json({
        success: true,
        data: {
          routeId,
          date,
          schedules: defaultTimes.map(time => ({
            time,
            available: 10,
            price: parseFloat(route.base_price)
          }))
        }
      } as ApiResponse<any>);
    }

    return NextResponse.json({
      success: true,
      data: {
        routeId,
        date,
        schedules
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch schedules',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}


