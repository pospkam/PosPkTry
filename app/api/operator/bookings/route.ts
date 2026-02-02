import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { getOperatorPartnerId } from '@/lib/auth/operator-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/operator/bookings
 * Get bookings for operator's tours
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

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const offset = (page - 1) * limit;

    // Build query
    let queryStr = `
      SELECT 
        b.id,
        b.tour_id,
        t.name as tour_name,
        b.user_id,
        u.name as user_name,
        u.email as user_email,
        u.preferences->>'phone' as user_phone,
        b.date,
        b.start_date,
        b.participants,
        b.guests_count,
        b.total_price,
        b.status,
        b.payment_status,
        b.special_requests,
        b.created_at,
        b.updated_at
      FROM bookings b
      JOIN tours t ON b.tour_id = t.id
      JOIN users u ON b.user_id = u.id
      WHERE t.operator_id = $1
    `;

    const params: any[] = [operatorId];
    let paramIndex = 2;

    // Search filter
    if (search) {
      queryStr += ` AND (u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR t.name ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Status filter
    if (status !== 'all') {
      queryStr += ` AND b.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    queryStr += `
      ORDER BY b.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await query(queryStr, params);

    // Get total count
    let countQuery = `
      SELECT COUNT(*) 
      FROM bookings b
      JOIN tours t ON b.tour_id = t.id
      JOIN users u ON b.user_id = u.id
      WHERE t.operator_id = $1
    `;
    const countParams: any[] = [operatorId];
    let countIndex = 2;

    if (search) {
      countQuery += ` AND (u.name ILIKE $${countIndex} OR u.email ILIKE $${countIndex} OR t.name ILIKE $${countIndex})`;
      countParams.push(`%${search}%`);
      countIndex++;
    }

    if (status !== 'all') {
      countQuery += ` AND b.status = $${countIndex}`;
      countParams.push(status);
    }

    const countResult = await query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    const bookings = result.rows.map(row => ({
      id: row.id,
      tourId: row.tour_id,
      tourName: row.tour_name,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      userPhone: row.user_phone,
      date: row.start_date || row.date,
      guestsCount: row.guests_count || row.participants,
      totalPrice: parseFloat(row.total_price),
      status: row.status,
      paymentStatus: row.payment_status,
      specialRequests: row.special_requests,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return NextResponse.json({
      success: true,
      data: {
        data: bookings,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get operator bookings error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении бронирований'
    } as ApiResponse<null>, { status: 500 });
  }
}
