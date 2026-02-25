import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/bookings
 * Get all bookings (admin view)
 */
// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let queryStr = `
      SELECT 
        b.*,
        t.name as tour_name,
        u.name as user_name,
        u.email as user_email
      FROM bookings b
      JOIN tours t ON b.tour_id = t.id
      JOIN users u ON b.user_id = u.id
    `;

    const params = [];
    let paramIndex = 1;

    if (status) {
      queryStr += ` WHERE b.status = $${paramIndex++}`;
      params.push(status);
    }

    queryStr += ` ORDER BY b.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await query(queryStr, params);

    const bookings = result.rows.map(row => ({
      id: row.id,
      date: row.date,
      participants: row.participants,
      totalPrice: parseFloat(row.total_price),
      status: row.status,
      paymentStatus: row.payment_status,
      specialRequests: row.special_requests,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      tourName: row.tour_name,
      userName: row.user_name,
      userEmail: row.user_email
    }));

    // Get total count
    const countResult = await query(
      status ? 'SELECT COUNT(*) FROM bookings WHERE status = $1' : 'SELECT COUNT(*) FROM bookings',
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
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get admin bookings error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении бронирований'
    } as ApiResponse<null>, { status: 500 });
  }
}
