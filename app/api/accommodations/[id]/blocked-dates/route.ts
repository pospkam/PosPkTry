import { NextRequest, NextResponse } from 'next/server';
import { query } from '@core-infrastructure/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/accommodations/[id]/blocked-dates
 * Получить список забронированных дат для отеля
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

    // Проверяем существование размещения
    const accommQuery = `
      SELECT id, name, is_active
      FROM accommodations
      WHERE id = $1
    `;
    const accommResult = await query(accommQuery, [id]);

    if (accommResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Accommodation not found'
      } as ApiResponse<null>, { status: 404 });
    }

    const accommodation = accommResult.rows[0];

    if (!accommodation.is_active) {
      return NextResponse.json({
        success: false,
        error: 'Accommodation is not active'
      } as ApiResponse<null>, { status: 400 });
    }

    // Получаем все забронированные даты в диапазоне
    const bookedDatesQuery = `
      WITH RECURSIVE date_series AS (
        SELECT $1::date AS date
        UNION ALL
        SELECT date + 1
        FROM date_series
        WHERE date < $2::date
      )
      SELECT DISTINCT
        ds.date::text
      FROM date_series ds
      WHERE EXISTS (
        SELECT 1 FROM accommodation_bookings ab
        WHERE ab.accommodation_id = $3
          AND ab.status IN ('confirmed', 'pending')
          AND ds.date >= DATE(ab.check_in)
          AND ds.date < DATE(ab.check_out)
      )
      ORDER BY ds.date
    `;

    const bookedResult = await query(bookedDatesQuery, [startDate, endDate, id]);
    const blockedDates = bookedResult.rows.map(row => row.date);

    return NextResponse.json({
      success: true,
      data: {
        accommodationId: id,
        startDate,
        endDate,
        blockedDates,
        blockedCount: blockedDates.length
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error fetching blocked dates:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch blocked dates',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}


