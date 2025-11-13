import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/dashboard
 * Get complete dashboard statistics
 */
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

    // Get users statistics
    const usersStats = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN role = 'tourist' THEN 1 ELSE 0 END) as tourists,
        SUM(CASE WHEN role = 'operator' THEN 1 ELSE 0 END) as operators,
        SUM(CASE WHEN role = 'guide' THEN 1 ELSE 0 END) as guides,
        SUM(CASE WHEN role = 'transfer' THEN 1 ELSE 0 END) as transfer_operators,
        SUM(CASE WHEN role = 'agent' THEN 1 ELSE 0 END) as agents,
        SUM(CASE WHEN role = 'admin' THEN 1 ELSE 0 END) as admins
      FROM users
    `);

    // Get tours statistics
    const toursStats = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_active THEN 1 ELSE 0 END) as active,
        AVG(rating) as avg_rating,
        SUM(review_count) as total_reviews
      FROM tours
    `);

    // Get bookings statistics
    const bookingsStats = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(CASE WHEN payment_status = 'paid' THEN total_price ELSE 0 END) as total_revenue,
        SUM(CASE WHEN payment_status = 'pending' THEN total_price ELSE 0 END) as pending_revenue
      FROM bookings
    `);

    // Get partners statistics
    const partnersStats = await query(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN is_verified THEN 1 ELSE 0 END) as verified,
        AVG(rating) as avg_rating,
        category,
        COUNT(*) as count
      FROM partners
      GROUP BY category
    `);

    // Get recent activity
    const recentBookings = await query(`
      SELECT 
        b.id,
        b.date,
        b.total_price,
        b.status,
        b.created_at,
        t.name as tour_name,
        u.name as user_name
      FROM bookings b
      JOIN tours t ON b.tour_id = t.id
      JOIN users u ON b.user_id = u.id
      ORDER BY b.created_at DESC
      LIMIT 10
    `);

    // Get monthly revenue trend (last 6 months)
    const revenueResult = await query(`
      SELECT 
        DATE_TRUNC('month', date) as month,
        SUM(total_price) as revenue,
        COUNT(*) as bookings_count
      FROM bookings
      WHERE payment_status = 'paid'
        AND date >= CURRENT_DATE - INTERVAL '6 months'
      GROUP BY DATE_TRUNC('month', date)
      ORDER BY month DESC
    `);

    const dashboard = {
      users: {
        total: parseInt(usersStats.rows[0].total),
        tourists: parseInt(usersStats.rows[0].tourists),
        operators: parseInt(usersStats.rows[0].operators),
        guides: parseInt(usersStats.rows[0].guides),
        transferOperators: parseInt(usersStats.rows[0].transfer_operators),
        agents: parseInt(usersStats.rows[0].agents),
        admins: parseInt(usersStats.rows[0].admins)
      },
      tours: {
        total: parseInt(toursStats.rows[0].total),
        active: parseInt(toursStats.rows[0].active),
        avgRating: parseFloat(toursStats.rows[0].avg_rating || 0).toFixed(2),
        totalReviews: parseInt(toursStats.rows[0].total_reviews)
      },
      bookings: {
        total: parseInt(bookingsStats.rows[0].total),
        pending: parseInt(bookingsStats.rows[0].pending),
        confirmed: parseInt(bookingsStats.rows[0].confirmed),
        completed: parseInt(bookingsStats.rows[0].completed),
        cancelled: parseInt(bookingsStats.rows[0].cancelled)
      },
      revenue: {
        total: parseFloat(bookingsStats.rows[0].total_revenue || 0),
        pending: parseFloat(bookingsStats.rows[0].pending_revenue || 0),
        monthlyTrend: revenueResult.rows.map(row => ({
          month: row.month,
          revenue: parseFloat(row.revenue),
          bookingsCount: parseInt(row.bookings_count)
        }))
      },
      partners: {
        total: partnersStats.rows.reduce((acc, row) => acc + parseInt(row.count), 0),
        verified: partnersStats.rows.reduce((acc, row) => acc + parseInt(row.is_verified || 0), 0),
        byCategory: partnersStats.rows.map(row => ({
          category: row.category,
          count: parseInt(row.count)
        }))
      },
      recentActivity: recentBookings.rows.map(row => ({
        id: row.id,
        date: row.date,
        totalPrice: parseFloat(row.total_price),
        status: row.status,
        createdAt: row.created_at,
        tourName: row.tour_name,
        userName: row.user_name
      }))
    };

    return NextResponse.json({
      success: true,
      data: dashboard
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get admin dashboard error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении статистики'
    } as ApiResponse<null>, { status: 500 });
  }
}
