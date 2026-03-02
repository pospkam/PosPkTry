import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * GET /api/bookings/my
 * Get current user's bookings
 */
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json({
        success: false,
        error: 'Не авторизован'
      } as ApiResponse<null>, { status: 401 });
    }
    const userId = auth.userId;

    const result = await query(
      `SELECT 
        b.id,
        b.date,
        b.participants,
        b.total_price,
        b.status,
        b.payment_status,
        b.special_requests,
        b.created_at,
        b.updated_at,
        t.id as tour_id,
        t.name as tour_name,
        t.description as tour_description,
        t.difficulty as tour_difficulty,
        t.duration as tour_duration,
        array_agg(DISTINCT a.url) as tour_images,
        p.name as operator_name,
        p.contact as operator_contact
       FROM bookings b
       JOIN tours t ON b.tour_id = t.id
       LEFT JOIN partners p ON t.operator_id = p.id
       LEFT JOIN tour_assets ta ON t.id = ta.tour_id
       LEFT JOIN assets a ON ta.asset_id = a.id
       WHERE b.user_id = $1
       GROUP BY b.id, t.id, p.id
       ORDER BY b.date DESC`,
      [userId]
    );

    const bookings = result.rows.map(row => ({
      id: row.id,
      date: row.date,
      participants: row.participants,
      totalPrice: row.total_price,
      status: row.status,
      paymentStatus: row.payment_status,
      specialRequests: row.special_requests,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      tour: {
        id: row.tour_id,
        name: row.tour_name,
        description: row.tour_description,
        difficulty: row.tour_difficulty,
        duration: row.tour_duration,
        images: row.tour_images.filter(Boolean)
      },
      operator: {
        name: row.operator_name,
        contact: row.operator_contact
      }
    }));

    return NextResponse.json({
      success: true,
      data: { bookings }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get bookings error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении бронирований'
    } as ApiResponse<null>, { status: 500 });
  }
}
