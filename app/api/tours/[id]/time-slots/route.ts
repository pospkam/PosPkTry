import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

interface TimeSlot {
  id: string;
  time: string; // HH:MM
  capacity: number;
  booked: number;
  available: number;
}

/**
 * GET /api/tours/[id]/time-slots
 * Получить временные слоты для индивидуальных туров на определённую дату
 * Public by design: time slot selection for booking flow.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    
    const date = searchParams.get('date');

    if (!date) {
      return NextResponse.json({
        success: false,
        error: 'Date is required'
      } as ApiResponse<null>, { status: 400 });
    }

    // Проверяем существование тура
    const tourQuery = `
      SELECT id, name, max_group_size, tour_type, is_active
      FROM tours
      WHERE id = $1
    `;
    const tourResult = await query(tourQuery, [id]);

    if (tourResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Tour not found'
      } as ApiResponse<null>, { status: 404 });
    }

    const tour = tourResult.rows[0];

    if (!tour.is_active) {
      return NextResponse.json({
        success: false,
        error: 'Tour is not active'
      } as ApiResponse<null>, { status: 400 });
    }

    // Для групповых туров возвращаем информацию о фиксированных датах
    if (tour.tour_type === 'group') {
      const groupDatesQuery = `
        SELECT
          td.id,
          td.tour_date,
          COALESCE(SUM(b.guests_count), 0) as booked_guests,
          $2::integer as max_capacity,
          ($2::integer - COALESCE(SUM(b.guests_count), 0)) as spots_left
        FROM tour_dates td
        LEFT JOIN bookings b ON b.tour_id = $1 
          AND DATE(b.start_date) = td.tour_date
          AND b.status IN ('confirmed', 'pending')
        WHERE td.tour_id = $1 AND DATE(td.tour_date) = $3::date
        GROUP BY td.id, td.tour_date
      `;

      const groupResult = await query(groupDatesQuery, [id, tour.max_group_size, date]);

      if (groupResult.rows.length === 0) {
        // Если нет фиксированной даты, возвращаем стандартный слот
        return NextResponse.json({
          success: true,
          data: {
            tourId: id,
            date,
            tourType: 'group',
            slots: [{
              id: `slot-${date}`,
              time: '09:00',
              capacity: tour.max_group_size,
              booked: 0,
              available: tour.max_group_size
            }]
          }
        } as ApiResponse<any>);
      }

      const slots: TimeSlot[] = groupResult.rows.map((row: any) => ({
        id: row.id,
        time: '09:00', // Групповые туры начинаются в 09:00
        capacity: parseInt(row.max_capacity),
        booked: parseInt(row.booked_guests),
        available: Math.max(0, parseInt(row.spots_left))
      }));

      return NextResponse.json({
        success: true,
        data: {
          tourId: id,
          date,
          tourType: 'group',
          slots
        }
      } as ApiResponse<any>);
    }

    // Для индивидуальных туров возвращаем несколько временных слотов
    const defaultSlots: TimeSlot[] = [
      { id: 'slot-1', time: '08:00', capacity: tour.max_group_size, booked: 0, available: tour.max_group_size },
      { id: 'slot-2', time: '10:00', capacity: tour.max_group_size, booked: 0, available: tour.max_group_size },
      { id: 'slot-3', time: '12:00', capacity: tour.max_group_size, booked: 0, available: tour.max_group_size },
      { id: 'slot-4', time: '14:00', capacity: tour.max_group_size, booked: 0, available: tour.max_group_size },
      { id: 'slot-5', time: '16:00', capacity: tour.max_group_size, booked: 0, available: tour.max_group_size }
    ];

    return NextResponse.json({
      success: true,
      data: {
        tourId: id,
        date,
        tourType: 'individual',
        slots: defaultSlots
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error fetching time slots:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch time slots',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}


