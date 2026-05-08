import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { OperatorDashboardData, OperatorMetrics, OperatorBooking, ChartDataPoint } from '@/types/operator';
import { requireOperator } from '@/lib/auth/middleware';
import { getOperatorPartnerId } from '@/lib/auth/operator-helpers';
import {
  OpDashboardMetricsRow,
  OpDashboardBookingRow,
  OpDashboardTopTourRow,
  OpDashboardChartRow,
  OpDashboardUpcomingTourRow,
} from '@/lib/types/db-rows';

export const dynamic = 'force-dynamic';

interface DashboardTourStats {
  id: string;
  tourId: string;
  tourName: string;
  bookingsCount: number;
  revenue: number;
  averageRating: number;
  reviewCount: number;
  completionRate: number;
}

/**
 * GET /api/operator/dashboard
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireOperator(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;

    const partnerId = await getOperatorPartnerId(userOrResponse.userId);
    if (!partnerId) {
      return NextResponse.json({
        success: false,
        error: 'Партнёрский профиль оператора не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const period = parseInt(searchParams.get('period') || '30');
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - period);

    // 1. МЕТРИКИ — из operator_tours + operator_bookings
    const metricsResult = await query<OpDashboardMetricsRow>(`
      WITH tour_stats AS (
        SELECT
          COUNT(DISTINCT t.id)                                      AS total_tours,
          COUNT(DISTINCT CASE WHEN t.is_active THEN t.id END)       AS active_tours,
          COALESCE(AVG(t.rating) FILTER (WHERE t.rating > 0), 0)    AS avg_rating,
          COALESCE(SUM(t.review_count), 0)                          AS total_reviews
        FROM operator_tours t
        WHERE t.operator_id = $1 AND t.deleted_at IS NULL
      ),
      booking_stats AS (
        SELECT
          COUNT(*)                                                                            AS total_bookings,
          COUNT(*) FILTER (WHERE b.booking_status = 'new')                                  AS pending_bookings,
          COUNT(*) FILTER (WHERE b.booking_status = 'confirmed')                            AS confirmed_bookings,
          COUNT(*) FILTER (WHERE b.booking_status = 'completed')                            AS completed_bookings,
          COUNT(*) FILTER (WHERE b.booking_status = 'cancelled')                            AS cancelled_bookings,
          COALESCE(SUM(b.final_price) FILTER (WHERE b.booking_status != 'cancelled'), 0)   AS total_revenue,
          COALESCE(SUM(b.final_price) FILTER (WHERE b.created_at >= $2 AND b.booking_status != 'cancelled'), 0) AS monthly_revenue
        FROM operator_bookings b
        JOIN operator_tours t ON b.operator_tour_id = t.id
        WHERE t.operator_id = $1 AND b.deleted_at IS NULL
      )
      SELECT ts.*, bs.*
      FROM tour_stats ts, booking_stats bs
    `, [partnerId, startDate]);

    // Leads stats for this operator
    const leadsResult = await query<{
      new_today: string; new_week: string; unprocessed: string;
    }>(
      `SELECT
         COUNT(*) FILTER (WHERE l.created_at >= CURRENT_DATE)                        AS new_today,
         COUNT(*) FILTER (WHERE l.created_at >= CURRENT_DATE - INTERVAL '7 days')   AS new_week,
         COUNT(*) FILTER (WHERE l.status = 'new')                                   AS unprocessed
       FROM leads l
       WHERE l.operator_id = $1`,
      [partnerId]
    );
    const lr = leadsResult.rows[0];

    const row = metricsResult.rows[0];
    const metrics: OperatorMetrics = {
      totalTours:        parseInt(String(row?.total_tours))        || 0,
      activeTours:       parseInt(String(row?.active_tours))       || 0,
      totalBookings:     parseInt(String(row?.total_bookings))     || 0,
      pendingBookings:   parseInt(String(row?.pending_bookings))   || 0,
      confirmedBookings: parseInt(String(row?.confirmed_bookings)) || 0,
      completedBookings: parseInt(String(row?.completed_bookings)) || 0,
      cancelledBookings: parseInt(String(row?.cancelled_bookings)) || 0,
      totalRevenue:      parseFloat(String(row?.total_revenue))    || 0,
      monthlyRevenue:    parseFloat(String(row?.monthly_revenue))  || 0,
      averageRating:     parseFloat(String(row?.avg_rating))       || 0,
      totalReviews:      parseInt(String(row?.total_reviews))      || 0,
      newLeadsToday:     parseInt(String(lr?.new_today))           || 0,
      newLeadsWeek:      parseInt(String(lr?.new_week))            || 0,
      unprocessedLeads:  parseInt(String(lr?.unprocessed))         || 0,
    };

    // 2. ПОСЛЕДНИЕ БРОНИРОВАНИЯ
    const bookingsResult = await query<OpDashboardBookingRow>(`
      SELECT
        b.id,
        b.operator_tour_id         AS tour_id,
        t.title                    AS tour_name,
        NULL::uuid                 AS user_id,
        b.tourist_name             AS user_name,
        b.tourist_email            AS user_email,
        b.booking_date             AS date,
        b.participants             AS guests_count,
        b.final_price              AS total_price,
        b.booking_status           AS status,
        b.payment_status,
        b.created_at,
        b.updated_at
      FROM operator_bookings b
      JOIN operator_tours t ON b.operator_tour_id = t.id
      WHERE t.operator_id = $1 AND b.deleted_at IS NULL
      ORDER BY b.created_at DESC
      LIMIT 10
    `, [partnerId]);

    const recentBookings: OperatorBooking[] = bookingsResult.rows.map(r => ({
      id:            String(r.id),
      tourId:        String(r.tour_id),
      tourName:      String(r.tour_name   ?? ''),
      userId:        String(r.user_id     ?? ''),
      userName:      String(r.user_name   ?? 'Гость'),
      userEmail:     String(r.user_email  ?? ''),
      date:          new Date(String(r.date)),
      guestsCount:   parseInt(String(r.guests_count)) || 1,
      totalPrice:    parseFloat(String(r.total_price)) || 0,
      status:        (r.status as OperatorBooking['status']) ?? 'new',
      paymentStatus: (r.payment_status as OperatorBooking['paymentStatus']) ?? 'pending',
      createdAt:     new Date(String(r.created_at)),
      updatedAt:     new Date(String(r.updated_at)),
    }));

    // 3. ТОП ТУРЫ
    const topToursResult = await query<OpDashboardTopTourRow>(`
      SELECT
        t.id::text                                                      AS tour_id,
        t.title                                                         AS tour_name,
        COUNT(b.id)                                                     AS bookings_count,
        COALESCE(SUM(b.final_price) FILTER (WHERE b.booking_status != 'cancelled'), 0) AS revenue,
        COALESCE(t.rating, 0)                                           AS avg_rating,
        COALESCE(t.review_count, 0)                                     AS review_count,
        ROUND(
          COUNT(b.id) FILTER (WHERE b.booking_status = 'completed')::numeric /
          NULLIF(COUNT(b.id), 0) * 100, 2
        )                                                               AS completion_rate
      FROM operator_tours t
      LEFT JOIN operator_bookings b ON t.id = b.operator_tour_id AND b.deleted_at IS NULL
      WHERE t.operator_id = $1 AND t.deleted_at IS NULL
      GROUP BY t.id, t.title, t.rating, t.review_count
      ORDER BY bookings_count DESC, revenue DESC
      LIMIT 5
    `, [partnerId]);

    const topTours: DashboardTourStats[] = topToursResult.rows.map(r => ({
      id:             String(r.tour_id),
      tourId:         String(r.tour_id),
      tourName:       String(r.tour_name),
      bookingsCount:  parseInt(String(r.bookings_count)) || 0,
      revenue:        parseFloat(String(r.revenue))      || 0,
      averageRating:  parseFloat(String(r.avg_rating))   || 0,
      reviewCount:    parseInt(String(r.review_count))   || 0,
      completionRate: parseFloat(String(r.completion_rate ?? '0')) || 0,
    }));

    // 4. ГРАФИК ВЫРУЧКИ
    const revenueChartResult = await query<OpDashboardChartRow>(`
      SELECT
        DATE(b.created_at)                                                         AS date,
        COALESCE(SUM(b.final_price) FILTER (WHERE b.booking_status != 'cancelled'), 0) AS value
      FROM operator_bookings b
      JOIN operator_tours t ON b.operator_tour_id = t.id
      WHERE t.operator_id = $1
        AND b.created_at >= $2
        AND b.deleted_at IS NULL
      GROUP BY DATE(b.created_at)
      ORDER BY date ASC
    `, [partnerId, startDate]);

    const revenueChart: ChartDataPoint[] = revenueChartResult.rows.map(r => ({
      date:  new Date(String(r.date)).toISOString().split('T')[0],
      value: parseFloat(String(r.value)) || 0,
      label: '',
    }));

    // 5. ГРАФИК БРОНИРОВАНИЙ
    const bookingsChartResult = await query<OpDashboardChartRow>(`
      SELECT
        DATE(b.created_at) AS date,
        COUNT(*)           AS value
      FROM operator_bookings b
      JOIN operator_tours t ON b.operator_tour_id = t.id
      WHERE t.operator_id = $1
        AND b.created_at >= $2
        AND b.deleted_at IS NULL
      GROUP BY DATE(b.created_at)
      ORDER BY date ASC
    `, [partnerId, startDate]);

    const bookingsChart: ChartDataPoint[] = bookingsChartResult.rows.map(r => ({
      date:  new Date(String(r.date)).toISOString().split('T')[0],
      value: parseInt(String(r.value)) || 0,
      label: '',
    }));

    // 6. ПРЕДСТОЯЩИЕ ТУРЫ (через availability slots)
    const upcomingResult = await query<OpDashboardUpcomingTourRow>(`
      SELECT
        t.id::text          AS tour_id,
        t.title             AS tour_name,
        a.date              AS date,
        a.booked_slots      AS bookings_count,
        a.available_slots   AS capacity
      FROM tour_availability a
      JOIN operator_tours t ON a.operator_tour_id = t.id
      WHERE t.operator_id = $1
        AND a.date >= CURRENT_DATE
        AND a.is_cancelled = FALSE
        AND a.deleted_at IS NULL
      ORDER BY a.date ASC
      LIMIT 5
    `, [partnerId]);

    const upcomingTours = upcomingResult.rows.map(r => ({
      tourId:        String(r.tour_id),
      tourName:      String(r.tour_name),
      date:          new Date(String(r.date)),
      bookingsCount: parseInt(String(r.bookings_count)) || 0,
      capacity:      parseInt(String(r.capacity))       || 0,
    }));

    const dashboardData: OperatorDashboardData = {
      metrics,
      recentBookings,
      topTours,
      revenueChart,
      bookingsChart,
      upcomingTours,
    };

    return NextResponse.json({ success: true, data: dashboardData } as ApiResponse<OperatorDashboardData>);
  } catch {
    return NextResponse.json({ success: false, error: 'Ошибка загрузки дашборда' } as ApiResponse<null>, { status: 500 });
  }
}
