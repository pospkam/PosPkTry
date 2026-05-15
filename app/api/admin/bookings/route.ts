import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAdmin } from '@/lib/auth/middleware';
import { BookingAdminRow, CountRow } from '@/lib/types/db-rows';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (status && status !== 'all') {
      conditions.push(`b.booking_status = $${paramIndex}`);
      params.push(status);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex} OR t.title ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query<CountRow>(
      `SELECT COUNT(*) as count
       FROM operator_bookings b
       LEFT JOIN operator_tours t ON t.id = b.operator_tour_id
       LEFT JOIN users u ON u.id = (b.metadata->>'user_id')::uuid
       ${whereClause}`,
      params
    );

    const bookingsResult = await query<BookingAdminRow>(
      `SELECT
         b.id,
         b.booking_date,
         b.participants,
         b.base_total_price,
         b.final_price,
         COALESCE(b.final_price, b.base_total_price) AS total_price,
         b.booking_status,
         b.payment_status,
         b.special_requests,
         b.created_at,
         b.updated_at,
         t.title AS tour_name,
         COALESCE(u.name, 'Гость') AS user_name,
         COALESCE(u.email, '') AS user_email
       FROM operator_bookings b
       LEFT JOIN operator_tours t ON t.id = b.operator_tour_id
       LEFT JOIN users u ON u.id = (b.metadata->>'user_id')::uuid
       ${whereClause}
       ORDER BY b.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      success: true,
      data: {
        bookings: bookingsResult.rows.map(b => ({
          id: b.id,
          date: b.booking_date,
          participants: b.participants,
          totalPrice: parseFloat(b.total_price),
          status: b.booking_status,
          paymentStatus: b.payment_status,
          specialRequests: b.special_requests,
          createdAt: b.created_at,
          updatedAt: b.updated_at,
          tourName: b.tour_name,
          userName: b.user_name,
          userEmail: b.user_email,
        })),
        pagination: {
          page,
          limit,
          total: parseInt(countResult.rows[0].count),
          totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
        },
      },
    } as ApiResponse<unknown>);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении бронирований' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
