import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireAdmin } from '@/lib/auth/middleware';
import { ApiResponse } from '@/types';
import { BookingAdminRow, CountRow } from '@/lib/types/db-rows';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/bookings
 * Get all bookings (admin view)
 */
export async function GET(request: NextRequest) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) {
      return adminOrResponse;
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let queryStr = `
      SELECT
        b.*,
        t.title as tour_name,
        b.tourist_name as user_name,
        b.tourist_phone as user_email
      FROM operator_bookings b
      JOIN operator_tours t ON b.operator_tour_id = t.id
    `;

    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (status) {
      queryStr += ` WHERE b.booking_status = $${paramIndex++}`;
      params.push(status);
    }

    queryStr += ` ORDER BY b.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await query<BookingAdminRow>(queryStr, params);

    const bookings = result.rows.map(row => ({
      id: row.id,
      date: row.booking_date ?? row.created_at,
      participants: row.participants,
      totalPrice: parseFloat(row.final_price ?? row.base_total_price ?? '0'),
      status: row.booking_status,
      paymentStatus: row.payment_status,
      specialRequests: row.special_requests,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      tourName: row.tour_name,
      userName: row.user_name,
      userEmail: row.user_email
    }));

    // Get total count
    const countResult = await query<CountRow>(
      status ? 'SELECT COUNT(*) FROM operator_bookings WHERE booking_status = $1' : 'SELECT COUNT(*) FROM operator_bookings',
      status ? [status] : []
    );

    return NextResponse.json({
      success: true,
      data: {
        bookings,
        total: parseInt(countResult.rows[0].count),
        limit,
        offset
      }
    } as ApiResponse<unknown>);

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении бронирований'
    } as ApiResponse<null>, { status: 500 });
  }
}
