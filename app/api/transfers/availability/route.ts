import { NextRequest, NextResponse } from 'next/server';
import { query } from '@core-infrastructure/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

interface TransferSlot {
  time: string;
  available: boolean;
  vehiclesLeft: number;
  price: number;
}

/**
 * GET /api/transfers/availability
 * Проверка доступности трансферов на дату
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const date = searchParams.get('date');
    const from = searchParams.get('from');
    const to = searchParams.get('to');
    const vehicleType = searchParams.get('vehicleType');

    if (!date || !from || !to) {
      return NextResponse.json({
        success: false,
        error: 'Date, from, and to locations are required'
      } as ApiResponse<null>, { status: 400 });
    }

    // Получаем доступные трансферы для маршрута
    const transfersQuery = `
      SELECT
        id,
        vehicle_type,
        capacity,
        price,
        available_times
      FROM transfer_options
      WHERE from_location = $1
        AND to_location = $2
        ${vehicleType ? 'AND vehicle_type = $3' : ''}
        AND is_active = true
    `;

    const queryParams = vehicleType ? [from, to, vehicleType] : [from, to];
    const transfersResult = await query(transfersQuery, queryParams);

    if (transfersResult.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          date,
          route: { from, to },
          slots: []
        }
      } as ApiResponse<any>);
    }

    // Для каждого времени проверяем занятость
    const slots: TransferSlot[] = [];
    const times = ['09:00', '12:00', '15:00', '18:00']; // Типичные слоты

    for (const time of times) {
      // Проверяем бронирования на это время
      const bookingsQuery = `
        SELECT COUNT(*) as booked_count
        FROM transfer_bookings
        WHERE pickup_date = $1
          AND pickup_time = $2
          AND from_location = $3
          AND to_location = $4
          AND status IN ('confirmed', 'pending')
      `;

      const bookingsResult = await query(bookingsQuery, [date, time, from, to]);
      const bookedCount = parseInt(bookingsResult.rows[0].booked_count) || 0;

      // Предположим, у нас 5 машин на каждый слот
      const totalVehicles = 5;
      const vehiclesLeft = Math.max(0, totalVehicles - bookedCount);
      const available = vehiclesLeft > 0;

      slots.push({
        time,
        available,
        vehiclesLeft,
        price: parseFloat(transfersResult.rows[0]?.price || 0)
      });
    }

    return NextResponse.json({
      success: true,
      data: {
        date,
        route: { from, to },
        vehicleType: vehicleType || 'any',
        slots
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error checking transfer availability:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to check availability',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}



