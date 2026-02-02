import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse, PaginatedResponse } from '@/types';
import { OperatorBooking } from '@/types/operator';

export const dynamic = 'force-dynamic';

/**
 * GET /api/operator/bookings
 * Получение списка бронирований оператора
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const operatorId = searchParams.get('operatorId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    
    const status = searchParams.get('status'); // 'pending', 'confirmed', 'cancelled', 'completed', 'all'
    const search = searchParams.get('search');
    const tourId = searchParams.get('tourId');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    if (!operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Operator ID is required'
      } as ApiResponse<null>, { status: 400 });
    }

    const whereConditions: string[] = ['t.operator_id = $1'];
    const queryParams: any[] = [operatorId];
    let paramIndex = 2;

    if (status && status !== 'all') {
      whereConditions.push(`b.status = $${paramIndex}`);
      queryParams.push(status);
      paramIndex++;
    }

    if (tourId) {
      whereConditions.push(`b.tour_id = $${paramIndex}`);
      queryParams.push(tourId);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR t.name ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Подсчёт
    const countQuery = `
      SELECT COUNT(*) as total
      FROM bookings b
      JOIN tours t ON b.tour_id = t.id
      JOIN users u ON b.user_id = u.id
      ${whereClause}
    `;

    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Получение бронирований
    const bookingsQuery = `
      SELECT
        b.id,
        b.tour_id,
        t.name as tour_name,
        b.user_id,
        u.name as user_name,
        u.email as user_email,
        u.phone as user_phone,
        b.start_date as date,
        b.guests_count,
        b.total_price,
        b.status,
        b.payment_status,
        b.special_requirements as notes,
        b.created_at,
        b.updated_at
      FROM bookings b
      JOIN tours t ON b.tour_id = t.id
      JOIN users u ON b.user_id = u.id
      ${whereClause}
      ORDER BY b.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const bookingsResult = await query(bookingsQuery, queryParams);

    const bookings: OperatorBooking[] = bookingsResult.rows.map(row => ({
      id: row.id,
      tourId: row.tour_id,
      tourName: row.tour_name,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      userPhone: row.user_phone,
      date: new Date(row.date),
      guestsCount: parseInt(row.guests_count) || 1,
      totalPrice: parseFloat(row.total_price),
      status: row.status,
      paymentStatus: row.payment_status,
      notes: row.notes,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));

    const response: PaginatedResponse<OperatorBooking> = {
      data: bookings,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };

    return NextResponse.json({
      success: true,
      data: response
    } as ApiResponse<PaginatedResponse<OperatorBooking>>);

  } catch (error) {
    console.error('Error fetching operator bookings:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch bookings',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}



