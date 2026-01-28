import { NextRequest, NextResponse } from 'next/server';
import { query } from '@core-infrastructure/lib/database';
import { ApiResponse } from '@/types';
import { OperatorDashboardData, OperatorMetrics, TourStats, OperatorBooking, ChartDataPoint } from '@/types/operator';
import { requireOperator } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/operator/dashboard
 * Получение данных Dashboard для оператора
 */
export async function GET(request: NextRequest) {
  try {
    // Проверяем аутентификацию и роль
    const userOrResponse = await requireOperator(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }
    
    const operatorId = userOrResponse.userId;
    const { searchParams } = new URL(request.url);
    const period = parseInt(searchParams.get('period') || '30');

    // Дата начала периода
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    // 1. МЕТРИКИ
    const metricsQuery = `
      WITH tour_stats AS (
        SELECT
          COUNT(DISTINCT t.id) as total_tours,
          COUNT(DISTINCT CASE WHEN t.is_active THEN t.id END) as active_tours
        FROM tours t
        WHERE t.operator_id = $1
      ),
      booking_stats AS (
        SELECT
          COUNT(*) as total_bookings,
          COUNT(CASE WHEN b.status = 'pending' THEN 1 END) as pending_bookings,
          COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
          COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
          COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
          COALESCE(SUM(b.total_price), 0) as total_revenue,
          COALESCE(SUM(CASE WHEN b.created_at >= $2 THEN b.total_price ELSE 0 END), 0) as monthly_revenue
        FROM bookings b
        JOIN tours t ON b.tour_id = t.id
        WHERE t.operator_id = $1
      ),
      review_stats AS (
        SELECT
          COALESCE(AVG(r.rating), 0) as avg_rating,
          COUNT(*) as total_reviews
        FROM reviews r
        JOIN tours t ON r.tour_id = t.id
        WHERE t.operator_id = $1
      )
      SELECT
        ts.total_tours,
        ts.active_tours,
        bs.total_bookings,
        bs.pending_bookings,
        bs.confirmed_bookings,
        bs.completed_bookings,
        bs.cancelled_bookings,
        bs.total_revenue,
        bs.monthly_revenue,
        rs.avg_rating,
        rs.total_reviews
      FROM tour_stats ts, booking_stats bs, review_stats rs
    `;

    const metricsResult = await query(metricsQuery, [operatorId, startDate]);
    const metricsRow = metricsResult.rows[0];

    const metrics: OperatorMetrics = {
      totalTours: parseInt(metricsRow.total_tours) || 0,
      activeTours: parseInt(metricsRow.active_tours) || 0,
      totalBookings: parseInt(metricsRow.total_bookings) || 0,
      pendingBookings: parseInt(metricsRow.pending_bookings) || 0,
      confirmedBookings: parseInt(metricsRow.confirmed_bookings) || 0,
      completedBookings: parseInt(metricsRow.completed_bookings) || 0,
      cancelledBookings: parseInt(metricsRow.cancelled_bookings) || 0,
      totalRevenue: parseFloat(metricsRow.total_revenue) || 0,
      monthlyRevenue: parseFloat(metricsRow.monthly_revenue) || 0,
      averageRating: parseFloat(metricsRow.avg_rating) || 0,
      totalReviews: parseInt(metricsRow.total_reviews) || 0
    };

    // 2. ПОСЛЕДНИЕ БРОНИРОВАНИЯ
    const recentBookingsQuery = `
      SELECT
        b.id,
        b.tour_id,
        t.name as tour_name,
        b.user_id,
        u.name as user_name,
        u.email as user_email,
        b.start_date as date,
        b.guests_count,
        b.total_price,
        b.status,
        b.payment_status,
        b.created_at,
        b.updated_at
      FROM bookings b
      JOIN tours t ON b.tour_id = t.id
      JOIN users u ON b.user_id = u.id
      WHERE t.operator_id = $1
      ORDER BY b.created_at DESC
      LIMIT 10
    `;

    const bookingsResult = await query(recentBookingsQuery, [operatorId]);
    const recentBookings: OperatorBooking[] = bookingsResult.rows.map(row => ({
      id: row.id,
      tourId: row.tour_id,
      tourName: row.tour_name,
      userId: row.user_id,
      userName: row.user_name,
      userEmail: row.user_email,
      date: new Date(row.date),
      guestsCount: parseInt(row.guests_count) || 1,
      totalPrice: parseFloat(row.total_price),
      status: row.status,
      paymentStatus: row.payment_status,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));

    // 3. ТОП ТУРЫ
    const topToursQuery = `
      SELECT
        t.id as tour_id,
        t.name as tour_name,
        COUNT(b.id) as bookings_count,
        COALESCE(SUM(b.total_price), 0) as revenue,
        COALESCE(AVG(r.rating), 0) as avg_rating,
        COUNT(DISTINCT r.id) as review_count,
        ROUND(
          COUNT(CASE WHEN b.status = 'completed' THEN 1 END)::numeric / 
          NULLIF(COUNT(b.id), 0) * 100, 
          2
        ) as completion_rate
      FROM tours t
      LEFT JOIN bookings b ON t.id = b.tour_id
      LEFT JOIN reviews r ON t.id = r.tour_id
      WHERE t.operator_id = $1
      GROUP BY t.id, t.name
      ORDER BY bookings_count DESC, revenue DESC
      LIMIT 5
    `;

    const topToursResult = await query(topToursQuery, [operatorId]);
    const topTours: TourStats[] = topToursResult.rows.map(row => ({
      tourId: row.tour_id,
      tourName: row.tour_name,
      bookingsCount: parseInt(row.bookings_count) || 0,
      revenue: parseFloat(row.revenue) || 0,
      averageRating: parseFloat(row.avg_rating) || 0,
      reviewCount: parseInt(row.review_count) || 0,
      completionRate: parseFloat(row.completion_rate) || 0
    }));

    // 4. ГРАФИК ВЫРУЧКИ (по дням за период)
    const revenueChartQuery = `
      SELECT
        DATE(b.created_at) as date,
        COALESCE(SUM(b.total_price), 0) as value
      FROM bookings b
      JOIN tours t ON b.tour_id = t.id
      WHERE t.operator_id = $1
        AND b.created_at >= $2
        AND b.status IN ('confirmed', 'completed')
      GROUP BY DATE(b.created_at)
      ORDER BY date ASC
    `;

    const revenueChartResult = await query(revenueChartQuery, [operatorId, startDate]);
    const revenueChart: ChartDataPoint[] = revenueChartResult.rows.map(row => ({
      date: new Date(row.date).toISOString().split('T')[0],
      value: parseFloat(row.value) || 0
    }));

    // 5. ГРАФИК БРОНИРОВАНИЙ (по дням за период)
    const bookingsChartQuery = `
      SELECT
        DATE(b.created_at) as date,
        COUNT(*) as value
      FROM bookings b
      JOIN tours t ON b.tour_id = t.id
      WHERE t.operator_id = $1
        AND b.created_at >= $2
      GROUP BY DATE(b.created_at)
      ORDER BY date ASC
    `;

    const bookingsChartResult = await query(bookingsChartQuery, [operatorId, startDate]);
    const bookingsChart: ChartDataPoint[] = bookingsChartResult.rows.map(row => ({
      date: new Date(row.date).toISOString().split('T')[0],
      value: parseInt(row.value) || 0
    }));

    // 6. ПРЕДСТОЯЩИЕ ТУРЫ
    const upcomingToursQuery = `
      SELECT
        t.id as tour_id,
        t.name as tour_name,
        b.start_date as date,
        COUNT(b.id) as bookings_count,
        t.max_group_size as capacity
      FROM tours t
      JOIN bookings b ON t.id = b.tour_id
      WHERE t.operator_id = $1
        AND b.start_date >= NOW()
        AND b.status IN ('confirmed', 'pending')
      GROUP BY t.id, t.name, b.start_date, t.max_group_size
      ORDER BY b.start_date ASC
      LIMIT 5
    `;

    const upcomingToursResult = await query(upcomingToursQuery, [operatorId]);
    const upcomingTours = upcomingToursResult.rows.map(row => ({
      tourId: row.tour_id,
      tourName: row.tour_name,
      date: new Date(row.date),
      bookingsCount: parseInt(row.bookings_count) || 0,
      capacity: parseInt(row.capacity) || 0
    }));

    // Формируем ответ
    const dashboardData: OperatorDashboardData = {
      metrics,
      recentBookings,
      topTours,
      revenueChart,
      bookingsChart,
      upcomingTours
    };

    return NextResponse.json({
      success: true,
      data: dashboardData
    } as ApiResponse<OperatorDashboardData>);

  } catch (error) {
    console.error('Error fetching operator dashboard:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch dashboard data',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}


