import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { TourDepartureRow } from '@/lib/types/db-rows';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tours/[id]/departures/[depId]
 * Один конкретный заезд. Публичный.
 */
export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string; depId: string }> }
) {
  try {
    const { id, depId } = await context.params;

    const tourCheck = await query<{ id: string; price: string }>(
      'SELECT id, price FROM tours WHERE id = $1',
      [id]
    );
    if (tourCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Тур не найден' },
        { status: 404 }
      );
    }

    const result = await query<TourDepartureRow>(
      'SELECT * FROM tour_departures WHERE id = $1 AND tour_id = $2',
      [depId, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Заезд не найден' },
        { status: 404 }
      );
    }

    const row = result.rows[0];
    const basePrice = parseFloat(tourCheck.rows[0].price);

    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        tourId: row.tour_id,
        startDate: row.start_date,
        endDate: row.end_date,
        availableSlots: row.available_slots,
        bookedSlots: row.booked_slots,
        spotsLeft: row.available_slots - row.booked_slots,
        price: row.price_override ? parseFloat(row.price_override) : basePrice,
        priceOverride: row.price_override ? parseFloat(row.price_override) : null,
        minGroupSize: row.min_group_size,
        status: row.status,
        notes: row.notes,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Ошибка загрузки заезда', details: process.env.NODE_ENV === 'development' ? msg : undefined },
      { status: 500 }
    );
  }
}
