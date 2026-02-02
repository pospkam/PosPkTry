import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { getOperatorPartnerId } from '@/lib/auth/operator-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/operator/stats
 * Get operator statistics
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
          error: 'Партнёр не найден'
        } as ApiResponse<null>, { status: 404 });
      }

    // Get tours count
    const toursResult = await query(
      'SELECT COUNT(*) as total, SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active FROM tours WHERE operator_id = $1',
      [operatorId]
    );

    // Get bookings stats
    const bookingsResult = await query(
      `SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled
       FROM bookings b
       JOIN tours t ON b.tour_id = t.id
       WHERE t.operator_id = $1`,
      [operatorId]
    );

    // Get revenue stats
    const revenueResult = await query(
      `SELECT 
        COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_price ELSE 0 END), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN b.payment_status = 'pending' THEN b.total_price ELSE 0 END), 0) as pending_revenue,
        COALESCE(SUM(CASE WHEN b.status = 'completed' AND b.payment_status = 'paid' 
                           AND EXTRACT(MONTH FROM b.date) = EXTRACT(MONTH FROM CURRENT_DATE)
                           THEN b.total_price ELSE 0 END), 0) as monthly_revenue
       FROM bookings b
       JOIN tours t ON b.tour_id = t.id
       WHERE t.operator_id = $1`,
      [operatorId]
    );

    // Get recent bookings
    const recentBookingsResult = await query(
      `SELECT 
        b.id,
        b.date,
        b.participants,
        b.total_price,
        b.status,
        t.name as tour_name,
        u.name as user_name
       FROM bookings b
       JOIN tours t ON b.tour_id = t.id
       JOIN users u ON b.user_id = u.id
       WHERE t.operator_id = $1
       ORDER BY b.created_at DESC
       LIMIT 10`,
      [operatorId]
    );

    const partnerInfoResult = await query(
      'SELECT id, name, rating, review_count FROM partners WHERE id = $1',
      [operatorId]
    );
    const operatorInfo = partnerInfoResult.rows[0];

    const stats = {
        operator: {
          id: operatorId,
          name: operatorInfo?.name || '',
          rating: parseFloat(operatorInfo?.rating || 0),
          reviewCount: parseInt(operatorInfo?.review_count || 0),
        },
      tours: {
        total: parseInt(toursResult.rows[0].total),
        active: parseInt(toursResult.rows[0].active)
      },
      bookings: {
        total: parseInt(bookingsResult.rows[0].total),
        pending: parseInt(bookingsResult.rows[0].pending),
        confirmed: parseInt(bookingsResult.rows[0].confirmed),
        completed: parseInt(bookingsResult.rows[0].completed),
        cancelled: parseInt(bookingsResult.rows[0].cancelled)
      },
      revenue: {
        total: parseFloat(revenueResult.rows[0].total_revenue),
        pending: parseFloat(revenueResult.rows[0].pending_revenue),
        monthly: parseFloat(revenueResult.rows[0].monthly_revenue)
      },
      recentBookings: recentBookingsResult.rows.map(row => ({
        id: row.id,
        date: row.date,
        participants: row.participants,
        totalPrice: parseFloat(row.total_price),
        status: row.status,
        tourName: row.tour_name,
        userName: row.user_name
      }))
    };

    return NextResponse.json({
      success: true,
      data: stats
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get operator stats error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении статистики'
    } as ApiResponse<null>, { status: 500 });
  }
}
