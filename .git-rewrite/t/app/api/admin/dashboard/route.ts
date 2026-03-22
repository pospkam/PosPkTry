import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireAdmin } from '@/lib/auth/middleware';
import { getAdminAlerts } from '@/lib/admin/alerts';
import { DashboardData, DashboardMetrics, DashboardCharts, RecentActivity, AdminAlert } from '@/types/admin';
import { ApiResponse } from '@/types';
import {
  DashboardMetricsRow,
  RevenueChartRow,
  CategoryCountRow,
  UserGrowthRow,
  TopTourRow,
  ActivityRow,
  TotalRow,
} from '@/lib/types/db-rows';

export const dynamic = 'force-dynamic';

const calculateChange = (
  current: number,
  previous: number
): { change: number; trend: 'up' | 'down' | 'neutral' } => {
  if (previous === 0) return { change: 0, trend: 'neutral' };
  const change = ((current - previous) / previous) * 100;
  return { change, trend: change > 0 ? 'up' : change < 0 ? 'down' : 'neutral' };
};

/**
 * GET /api/admin/dashboard
 * Получение данных для административной панели
 */
export async function GET(request: NextRequest) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) {
      return adminOrResponse;
    }

    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30';
    const now = new Date();
    const periodDays = parseInt(period, 10);
    const currentPeriodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const previousPeriodStart = new Date(currentPeriodStart.getTime() - periodDays * 24 * 60 * 60 * 1000);

    // 1. МЕТРИКИ — если упадёт, возвращаем нулевые значения
    let metrics: DashboardMetrics;
    try {
      const metricsQuery = `
        WITH current_period AS (
          SELECT
            COUNT(DISTINCT b.id) as bookings_count,
            COALESCE(SUM(b.total_price), 0) as total_revenue,
            COUNT(DISTINCT b.user_id) as unique_users
          FROM bookings b
          WHERE b.created_at >= $1
        ),
        previous_period AS (
          SELECT
            COUNT(DISTINCT b.id) as bookings_count,
            COALESCE(SUM(b.total_price), 0) as total_revenue,
            COUNT(DISTINCT b.user_id) as unique_users
          FROM bookings b
          WHERE b.created_at >= $2 AND b.created_at < $1
        ),
        users_stats AS (
          SELECT COUNT(*) as total_users
          FROM users
          WHERE created_at >= $1
        ),
        conversion AS (
          SELECT COUNT(DISTINCT user_id) as users_with_bookings
          FROM bookings
          WHERE created_at >= $1
        )
        SELECT
          cp.bookings_count as current_bookings,
          pp.bookings_count as previous_bookings,
          cp.total_revenue as current_revenue,
          pp.total_revenue as previous_revenue,
          cp.unique_users as current_users,
          pp.unique_users as previous_users,
          us.total_users,
          c.users_with_bookings,
          CASE
            WHEN us.total_users > 0
            THEN (c.users_with_bookings::float / us.total_users::float * 100)
            ELSE 0
          END as conversion_rate
        FROM current_period cp, previous_period pp, users_stats us, conversion c
      `;

      const metricsResult = await query<DashboardMetricsRow>(metricsQuery, [
        currentPeriodStart,
        previousPeriodStart,
      ]);
      const r = metricsResult.rows[0];

      const revenueChange = calculateChange(
        parseFloat(r.current_revenue),
        parseFloat(r.previous_revenue)
      );
      const bookingsChange = calculateChange(
        parseInt(r.current_bookings, 10),
        parseInt(r.previous_bookings, 10)
      );
      const usersChange = calculateChange(
        parseInt(r.current_users, 10),
        parseInt(r.previous_users, 10)
      );
      const aov = parseInt(r.current_bookings, 10) > 0
        ? parseFloat(r.current_revenue) / parseInt(r.current_bookings, 10)
        : 0;
      const prevAov = parseInt(r.previous_bookings, 10) > 0
        ? parseFloat(r.previous_revenue) / parseInt(r.previous_bookings, 10)
        : 0;

      metrics = {
        totalRevenue: { value: parseFloat(r.current_revenue), ...revenueChange },
        totalBookings: { value: parseInt(r.current_bookings, 10), ...bookingsChange },
        activeUsers: { value: parseInt(r.total_users, 10), ...usersChange },
        conversionRate: { value: parseFloat(r.conversion_rate), change: 0, trend: 'neutral' },
        averageOrderValue: { value: aov, ...calculateChange(aov, prevAov) },
        growthRate: { value: revenueChange.change, change: 0, trend: revenueChange.trend },
      };
    } catch {
      metrics = {
        totalRevenue: { value: 0, change: 0, trend: 'neutral' },
        totalBookings: { value: 0, change: 0, trend: 'neutral' },
        activeUsers: { value: 0, change: 0, trend: 'neutral' },
        conversionRate: { value: 0, change: 0, trend: 'neutral' },
        averageOrderValue: { value: 0, change: 0, trend: 'neutral' },
        growthRate: { value: 0, change: 0, trend: 'neutral' },
      };
    }

    // 2. ГРАФИКИ
    let revenueByMonth: DashboardCharts['revenueByMonth'] = [];
    let bookingsByCategory: DashboardCharts['bookingsByCategory'] = [];
    let userGrowth: DashboardCharts['userGrowth'] = [];
    let topTours: DashboardCharts['topTours'] = [];

    try {
      const revenueChartResult = await query<RevenueChartRow>(
        `SELECT DATE_TRUNC('month', created_at) as month,
                COALESCE(SUM(total_price), 0) as revenue
         FROM bookings
         WHERE created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '5 months'
         GROUP BY month ORDER BY month`,
        []
      );
      revenueByMonth = revenueChartResult.rows.map(row => ({
        date: new Date(row.month).toISOString().substring(0, 7),
        value: parseFloat(row.revenue),
      }));
    } catch { /* пустой массив */ }

    try {
      const categoryColors: Record<string, string> = {
        operator: '#E6C149',
        guide: '#10B981',
        transfer: '#3B82F6',
        stay: '#F59E0B',
        other: '#6B7280',
      };
      const categoryResult = await query<CategoryCountRow>(
        `SELECT COALESCE(p.category, 'other') as category, COUNT(b.id) as count
         FROM bookings b
         LEFT JOIN tours t ON b.tour_id = t.id
         LEFT JOIN partners p ON t.operator_id = p.id
         WHERE b.created_at >= $1
         GROUP BY p.category ORDER BY count DESC`,
        [currentPeriodStart]
      );
      bookingsByCategory = categoryResult.rows.map(row => ({
        category: row.category,
        value: parseInt(row.count, 10),
        color: categoryColors[row.category] ?? '#6B7280',
      }));
    } catch { /* пустой массив */ }

    try {
      const userGrowthResult = await query<UserGrowthRow>(
        `SELECT DATE_TRUNC('day', created_at) as date, COUNT(*) as count
         FROM users WHERE created_at >= $1
         GROUP BY date ORDER BY date`,
        [currentPeriodStart]
      );
      userGrowth = userGrowthResult.rows.map(row => ({
        date: new Date(row.date).toISOString().substring(0, 10),
        value: parseInt(row.count, 10),
      }));
    } catch { /* пустой массив */ }

    try {
      const topToursResult = await query<TopTourRow>(
        `SELECT t.id, t.title,
                COUNT(b.id) as bookings,
                COALESCE(SUM(b.total_price), 0) as revenue
         FROM tours t
         LEFT JOIN bookings b ON t.id = b.tour_id AND b.created_at >= $1
         WHERE t.is_active = true
         GROUP BY t.id, t.title
         ORDER BY bookings DESC, revenue DESC
         LIMIT 5`,
        [currentPeriodStart]
      );
      topTours = topToursResult.rows.map(row => ({
        id: row.id,
        title: row.title,
        bookings: parseInt(row.bookings, 10),
        revenue: parseFloat(row.revenue),
      }));
    } catch { /* пустой массив */ }

    const charts: DashboardCharts = { revenueByMonth, bookingsByCategory, userGrowth, topTours };

    // 3. ПОСЛЕДНИЕ АКТИВНОСТИ (из 3 аудит-таблиц)
    let recentActivities: RecentActivity[] = [];
    try {
      const activitiesResult = await query<ActivityRow>(
        `(SELECT b.id, 'booking' as type, 'Новое бронирование' as title,
                t.title as description, b.created_at as timestamp,
                u.id as user_id, u.email as user_name, NULL as user_avatar
         FROM bookings b
         JOIN tours t ON b.tour_id = t.id
         JOIN users u ON b.user_id = u.id
         WHERE b.created_at >= NOW() - INTERVAL '24 hours')
        UNION ALL
        (SELECT al.id::text, 'user' as type, al.action as title,
                COALESCE(al.resource_type, '') as description, al.created_at as timestamp,
                al.user_id::text as user_id, u2.email as user_name, NULL as user_avatar
         FROM audit_logs al
         LEFT JOIN users u2 ON al.user_id = u2.id
         WHERE al.created_at >= NOW() - INTERVAL '24 hours')
        UNION ALL
        (SELECT bl.id::text, 'booking' as type,
                'Статус: ' || bl.from_status || ' → ' || bl.to_status as title,
                COALESCE(bl.comment, '') as description, bl.created_at as timestamp,
                bl.changed_by::text as user_id, u3.email as user_name, NULL as user_avatar
         FROM booking_logs bl
         LEFT JOIN users u3 ON bl.changed_by = u3.id
         WHERE bl.created_at >= NOW() - INTERVAL '24 hours')
        ORDER BY timestamp DESC
        LIMIT 10`,
        []
      );
      recentActivities = activitiesResult.rows.map(row => ({
        id: row.id,
        type: row.type as RecentActivity['type'],
        title: row.title,
        description: row.description,
        timestamp: new Date(row.timestamp),
        user: row.user_id
          ? { id: row.user_id, name: row.user_name ?? '', avatar: row.user_avatar ?? undefined }
          : undefined,
      }));
    } catch { /* пустой массив */ }

    // 4. ОЖИДАЮЩИЕ ЗАЯВКИ
    let pendingPartners = 0;
    let pendingTours = 0;
    try {
      const ppResult = await query<TotalRow>(
        `SELECT COUNT(*) as total FROM partners WHERE is_verified = false`,
        []
      );
      pendingPartners = parseInt(ppResult.rows[0]?.total ?? '0', 10);
    } catch { /* 0 */ }
    try {
      const ptResult = await query<TotalRow>(
        `SELECT COUNT(*) as total FROM tours WHERE is_active = false`,
        []
      );
      pendingTours = parseInt(ptResult.rows[0]?.total ?? '0', 10);
    } catch { /* 0 */ }

    let alerts: AdminAlert[] = [];
    try {
      alerts = await getAdminAlerts();
    } catch { /* fallback empty */ }

    const dashboardData: DashboardData = {
      metrics,
      charts,
      recentActivities,
      alerts,
      summary: { period: periodDays, lastUpdated: now },
      pendingPartners,
      pendingTours,
    };

    return NextResponse.json({ success: true, data: dashboardData } as ApiResponse<DashboardData>);
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: 'Ошибка загрузки данных панели администратора',
        message: error instanceof Error ? error.message : 'Неизвестная ошибка',
      } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
