import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { DashboardData, DashboardMetrics, DashboardCharts, RecentActivity, AdminAlert } from '@/types/admin';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/dashboard
 * Получение данных для административной панели
 */
// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // дней назад

    // Вычисляем даты для сравнения
    const now = new Date();
    const periodDays = parseInt(period);
    const currentPeriodStart = new Date(now.getTime() - periodDays * 24 * 60 * 60 * 1000);
    const previousPeriodStart = new Date(currentPeriodStart.getTime() - periodDays * 24 * 60 * 60 * 1000);

    // 1. МЕТРИКИ
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
        SELECT 
          COUNT(DISTINCT user_id) as users_with_bookings
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
          WHEN us.total_users > 0 THEN (c.users_with_bookings::float / us.total_users::float * 100)
          ELSE 0
        END as conversion_rate
      FROM current_period cp, previous_period pp, users_stats us, conversion c
    `;

    const metricsResult = await query(metricsQuery, [currentPeriodStart, previousPeriodStart]);
    const metricsRow = metricsResult.rows[0];

    // Вычисляем изменения и тренды
    const calculateChange = (current: number, previous: number): { change: number; trend: 'up' | 'down' | 'neutral' } => {
      if (previous === 0) return { change: 0, trend: 'neutral' };
      const change = ((current - previous) / previous) * 100;
      const trend = change > 0 ? 'up' : change < 0 ? 'down' : 'neutral';
      return { change, trend };
    };

    const revenueChange = calculateChange(
      parseFloat(metricsRow.current_revenue),
      parseFloat(metricsRow.previous_revenue)
    );

    const bookingsChange = calculateChange(
      parseInt(metricsRow.current_bookings),
      parseInt(metricsRow.previous_bookings)
    );

    const usersChange = calculateChange(
      parseInt(metricsRow.current_users),
      parseInt(metricsRow.previous_users)
    );

    const averageOrderValue = metricsRow.current_bookings > 0
      ? parseFloat(metricsRow.current_revenue) / parseInt(metricsRow.current_bookings)
      : 0;

    const previousAverageOrderValue = metricsRow.previous_bookings > 0
      ? parseFloat(metricsRow.previous_revenue) / parseInt(metricsRow.previous_bookings)
      : 0;

    const aovChange = calculateChange(averageOrderValue, previousAverageOrderValue);

    const metrics: DashboardMetrics = {
      totalRevenue: {
        value: parseFloat(metricsRow.current_revenue),
        change: revenueChange.change,
        trend: revenueChange.trend
      },
      totalBookings: {
        value: parseInt(metricsRow.current_bookings),
        change: bookingsChange.change,
        trend: bookingsChange.trend
      },
      activeUsers: {
        value: parseInt(metricsRow.total_users),
        change: usersChange.change,
        trend: usersChange.trend
      },
      conversionRate: {
        value: parseFloat(metricsRow.conversion_rate),
        change: 0, // Для упрощения, можно добавить позже
        trend: 'neutral'
      },
      averageOrderValue: {
        value: averageOrderValue,
        change: aovChange.change,
        trend: aovChange.trend
      },
      growthRate: {
        value: revenueChange.change,
        change: 0,
        trend: revenueChange.trend
      }
    };

    // 2. ГРАФИКИ - Выручка по месяцам
    const revenueChartQuery = `
      SELECT
        DATE_TRUNC('month', created_at) as month,
        COALESCE(SUM(total_price), 0) as revenue
      FROM bookings
      WHERE created_at >= DATE_TRUNC('month', NOW()) - INTERVAL '5 months'
      GROUP BY month
      ORDER BY month
    `;

    const revenueChartResult = await query(revenueChartQuery, []);
    const revenueByMonth = revenueChartResult.rows.map(row => ({
      date: new Date(row.month).toISOString().substring(0, 7), // YYYY-MM
      value: parseFloat(row.revenue)
    }));

    // 3. Бронирования по категориям
    const bookingsByCategoryQuery = `
      SELECT
        COALESCE(p.category, 'other') as category,
        COUNT(b.id) as count
      FROM bookings b
      LEFT JOIN tours t ON b.tour_id = t.id
      LEFT JOIN partners p ON t.operator_id = p.id
      WHERE b.created_at >= $1
      GROUP BY p.category
      ORDER BY count DESC
    `;

    const categoryResult = await query(bookingsByCategoryQuery, [currentPeriodStart]);
    
    const categoryColors: Record<string, string> = {
      operator: '#E6C149',
      guide: '#10B981',
      transfer: '#3B82F6',
      stay: '#F59E0B',
      other: '#6B7280'
    };

    const bookingsByCategory = categoryResult.rows.map(row => ({
      category: row.category,
      value: parseInt(row.count),
      color: categoryColors[row.category] || '#6B7280'
    }));

    // 4. Рост пользователей
    const userGrowthQuery = `
      SELECT
        DATE_TRUNC('day', created_at) as date,
        COUNT(*) as count
      FROM users
      WHERE created_at >= $1
      GROUP BY date
      ORDER BY date
    `;

    const userGrowthResult = await query(userGrowthQuery, [currentPeriodStart]);
    const userGrowth = userGrowthResult.rows.map(row => ({
      date: new Date(row.date).toISOString().substring(0, 10), // YYYY-MM-DD
      value: parseInt(row.count)
    }));

    // 5. Топ туры
    const topToursQuery = `
      SELECT
        t.id,
        t.title,
        COUNT(b.id) as bookings,
        COALESCE(SUM(b.total_price), 0) as revenue
      FROM tours t
      LEFT JOIN bookings b ON t.id = b.tour_id AND b.created_at >= $1
      WHERE t.is_active = true
      GROUP BY t.id, t.title
      ORDER BY bookings DESC, revenue DESC
      LIMIT 5
    `;

    const topToursResult = await query(topToursQuery, [currentPeriodStart]);
    const topTours = topToursResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      bookings: parseInt(row.bookings),
      revenue: parseFloat(row.revenue)
    }));

    const charts: DashboardCharts = {
      revenueByMonth,
      bookingsByCategory,
      userGrowth,
      topTours
    };

    // 6. ПОСЛЕДНИЕ АКТИВНОСТИ
    const activitiesQuery = `
      SELECT
        b.id,
        'booking' as type,
        'Новое бронирование' as title,
        t.title as description,
        b.created_at as timestamp,
        u.id as user_id,
        u.email as user_name,
        NULL as user_avatar
      FROM bookings b
      JOIN tours t ON b.tour_id = t.id
      JOIN users u ON b.user_id = u.id
      WHERE b.created_at >= NOW() - INTERVAL '24 hours'
      ORDER BY b.created_at DESC
      LIMIT 10
    `;

    const activitiesResult = await query(activitiesQuery, []);
    const recentActivities: RecentActivity[] = activitiesResult.rows.map(row => ({
      id: row.id,
      type: row.type,
      title: row.title,
      description: row.description,
      timestamp: new Date(row.timestamp),
      user: row.user_id ? {
        id: row.user_id,
        name: row.user_name,
        avatar: row.user_avatar
      } : undefined
    }));

    // 7. АЛЕРТЫ (пока заглушка, можно добавить логику позже)
    const alerts: AdminAlert[] = [];

    // 8. ПОДСЧЁТ ОЖИДАЮЩИХ ЗАЯВОК
    const pendingPartnersQuery = `
      SELECT COUNT(*) as total
      FROM partners
      WHERE is_verified = false
    `;
    const pendingPartnersResult = await query(pendingPartnersQuery, []);
    const pendingPartners = parseInt(pendingPartnersResult.rows[0]?.total || '0');

    const pendingToursQuery = `
      SELECT COUNT(*) as total
      FROM tours
      WHERE is_active = false
    `;
    const pendingToursResult = await query(pendingToursQuery, []);
    const pendingTours = parseInt(pendingToursResult.rows[0]?.total || '0');

    // Собираем все данные
    const dashboardData: DashboardData = {
      metrics,
      charts,
      recentActivities,
      alerts,
      summary: {
        period: periodDays,
        lastUpdated: now
      },
      pendingPartners,
      pendingTours,
    };

    return NextResponse.json({
      success: true,
      data: dashboardData
    } as ApiResponse<DashboardData>);

  } catch (error) {
    console.error('Error fetching admin dashboard data:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch dashboard data',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}



