import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

interface AvailabilityDate {
  date: string;
  available: boolean;
  spotsLeft: number;
  price: number;
  reason?: string;
}

/**
 * GET /api/tours/[id]/availability
 * Проверка доступности дат для тура
 * Public by design: availability check for tour selection.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    if (!startDate || !endDate) {
      return NextResponse.json({
        success: false,
        error: 'Start and end dates are required'
      } as ApiResponse<null>, { status: 400 });
    }

    // Проверяем существование тура
    const tourQuery = `
      SELECT id, name, max_group_size, min_group_size, price, is_active
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

    // Генерируем даты в диапазоне
    const availabilityQuery = `
      WITH RECURSIVE date_series AS (
        SELECT $1::date AS date
        UNION ALL
        SELECT date + 1
        FROM date_series
        WHERE date < $2::date
      ),
      booking_counts AS (
        SELECT
          DATE(b.start_date) as booking_date,
          COALESCE(SUM(b.guests_count), 0) as booked_count
        FROM bookings b
        WHERE b.tour_id = $3
          AND b.status IN ('confirmed', 'pending')
          AND DATE(b.start_date) BETWEEN $1 AND $2
        GROUP BY DATE(b.start_date)
      )
      SELECT
        ds.date::text,
        COALESCE(bc.booked_count, 0) as booked,
        $4::integer as max_capacity,
        ($4::integer - COALESCE(bc.booked_count, 0)) as spots_left,
        CASE
          WHEN ds.date < CURRENT_DATE THEN 'past'
          WHEN COALESCE(bc.booked_count, 0) >= $4::integer THEN 'full'
          ELSE 'available'
        END as status
      FROM date_series ds
      LEFT JOIN booking_counts bc ON bc.booking_date = ds.date
      ORDER BY ds.date
    `;

    const availResult = await query(availabilityQuery, [
      startDate,
      endDate,
      id,
      tour.max_group_size
    ]);

    const availability: AvailabilityDate[] = availResult.rows.map(row => {
      const available = row.status === 'available';
      const spotsLeft = parseInt(row.spots_left);
      
      let reason: string | undefined;
      if (row.status === 'past') {
        reason = 'Дата в прошлом';
      } else if (row.status === 'full') {
        reason = 'Все места заняты';
      }

      return {
        date: row.date,
        available,
        spotsLeft: available ? spotsLeft : 0,
        price: parseFloat(tour.price),
        reason
      };
    });

    return NextResponse.json({
      success: true,
      data: {
        tourId: id,
        tourName: tour.name,
        availability,
        maxGroupSize: parseInt(tour.max_group_size),
        minGroupSize: parseInt(tour.min_group_size)
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error checking availability:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check availability',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}



