import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { getOperatorPartnerId, verifyTourOwnership } from '@/lib/auth/operator-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/operator/calendar
 * Get tour availability calendar
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'operator') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    const operatorId = await getOperatorPartnerId(userId);
    
    if (!operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Профиль оператора не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const tourId = searchParams.get('tourId');
    const startDate = searchParams.get('startDate') || new Date().toISOString().split('T')[0];
    const endDate = searchParams.get('endDate') || new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    let queryStr = `
      SELECT 
        ta.id,
        ta.tour_id,
        t.name as tour_name,
        t.max_group_size,
        ta.date,
        ta.available_spots,
        ta.is_blocked,
        ta.block_reason,
        ta.price_override,
        ta.notes,
        COALESCE(
          (SELECT COUNT(*) FROM bookings b 
           WHERE b.tour_id = ta.tour_id 
           AND b.start_date = ta.date 
           AND b.status IN ('confirmed', 'pending')
          ), 0
        ) as booked_spots
      FROM tour_availability ta
      JOIN tours t ON ta.tour_id = t.id
      WHERE t.operator_id = $1
        AND ta.date >= $2
        AND ta.date <= $3
    `;

    const params: any[] = [operatorId, startDate, endDate];
    let paramIndex = 4;

    if (tourId) {
      queryStr += ` AND ta.tour_id = $${paramIndex}`;
      params.push(tourId);
      paramIndex++;
    }

    queryStr += ` ORDER BY ta.date ASC, t.name ASC`;

    const result = await query(queryStr, params);

    const availability = result.rows.map(row => ({
      id: row.id,
      tourId: row.tour_id,
      tourName: row.tour_name,
      date: row.date,
      maxGroupSize: row.max_group_size,
      availableSpots: row.available_spots,
      bookedSpots: parseInt(row.booked_spots),
      remainingSpots: row.available_spots - parseInt(row.booked_spots),
      isBlocked: row.is_blocked,
      blockReason: row.block_reason,
      priceOverride: row.price_override ? parseFloat(row.price_override) : null,
      notes: row.notes
    }));

    return NextResponse.json({
      success: true,
      data: { availability }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get calendar error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении календаря'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/operator/calendar
 * Set availability for a tour date
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'operator') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    const body = await request.json();
    const { tourId, date, availableSpots, isBlocked, blockReason, priceOverride, notes } = body;

    if (!tourId || !date) {
      return NextResponse.json({
        success: false,
        error: 'tourId и date обязательны'
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

    // Insert or update availability
    const result = await query(
      `INSERT INTO tour_availability (
        tour_id, date, available_spots, is_blocked, block_reason, price_override, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (tour_id, date) DO UPDATE SET
        available_spots = EXCLUDED.available_spots,
        is_blocked = EXCLUDED.is_blocked,
        block_reason = EXCLUDED.block_reason,
        price_override = EXCLUDED.price_override,
        notes = EXCLUDED.notes
      RETURNING *`,
      [
        tourId,
        date,
        availableSpots || 0,
        isBlocked || false,
        blockReason,
        priceOverride,
        notes
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Доступность обновлена'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Set availability error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при установке доступности'
    } as ApiResponse<null>, { status: 500 });
  }
}
