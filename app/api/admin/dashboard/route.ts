import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { query } from '@/lib/database';
import {
  DashboardMetricsRow, RevenueChartRow, CategoryCountRow,
  UserGrowthRow, TopTourRow, ActivityRow,
} from '@/lib/types/db-rows';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const [metrics, revenueChart, categoryStats, userGrowth, topTours, recentActivity] =
      await Promise.all([
        query<DashboardMetricsRow>(`
          WITH current_period AS (
            SELECT
              COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS current_bookings,
              COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days') AS previous_bookings,
              SUM(COALESCE(final_price, base_total_price)) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days' AND booking_status = 'confirmed') AS current_revenue,
              SUM(COALESCE(final_price, base_total_price)) FILTER (WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days' AND booking_status = 'confirmed') AS previous_revenue
            FROM operator_bookings
          ),
          user_stats AS (
            SELECT
              COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '30 days') AS current_users,
              COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '60 days' AND created_at < NOW() - INTERVAL '30 days') AS previous_users,
              COUNT(*) AS total_users
            FROM users
          ),
          conversion AS (
            SELECT
              COUNT(DISTINCT u.id) AS users_with_bookings
            FROM users u
            WHERE EXISTS (SELECT 1 FROM operator_bookings b WHERE b.metadata->>'user_id' = u.id::text)
          )
          SELECT
            cp.current_bookings,
            cp.previous_bookings,
            COALESCE(cp.current_revenue, 0) AS current_revenue,
            COALESCE(cp.previous_revenue, 0) AS previous_revenue,
            us.current_users,
            us.previous_users,
            us.total_users,
            cv.users_with_bookings,
            CASE WHEN us.total_users > 0
              THEN ROUND((cv.users_with_bookings::numeric / us.total_users) * 100, 2)
              ELSE 0
            END AS conversion_rate
          FROM current_period cp, user_stats us, conversion cv
        `),
        query<RevenueChartRow>(`
          SELECT
            DATE_TRUNC('month', b.created_at) AS month,
            SUM(COALESCE(b.final_price, b.base_total_price)) AS revenue
          FROM operator_bookings b
          WHERE b.booking_status = 'confirmed'
            AND b.created_at >= NOW() - INTERVAL '12 months'
          GROUP BY DATE_TRUNC('month', b.created_at)
          ORDER BY month ASC
        `),
        query<CategoryCountRow>(`
          SELECT category, COUNT(*) as count
          FROM operator_tours
          WHERE is_active = true
          GROUP BY category
          ORDER BY count DESC
          LIMIT 10
        `),
        query<UserGrowthRow>(`
          SELECT DATE(created_at) as date, COUNT(*) as count
          FROM users
          WHERE created_at >= NOW() - INTERVAL '30 days'
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `),
        query<TopTourRow>(`
          SELECT
            t.id,
            t.title,
            COUNT(b.id) AS bookings,
            COALESCE(SUM(COALESCE(b.final_price, b.base_total_price)) FILTER (WHERE b.booking_status = 'confirmed'), 0) AS revenue
          FROM operator_tours t
          LEFT JOIN operator_bookings b ON b.operator_tour_id = t.id
          GROUP BY t.id, t.title
          ORDER BY bookings DESC
          LIMIT 5
        `),
        query<ActivityRow>(`
          SELECT
            b.id,
            'booking' AS type,
            'New booking' AS title,
            CONCAT('Новое бронирование: ', t.title) AS description,
            b.created_at AS timestamp,
            (b.metadata->>'user_id')::uuid AS user_id,
            u.name AS user_name,
            NULL AS user_avatar
          FROM operator_bookings b
          JOIN operator_tours t ON t.id = b.operator_tour_id
          LEFT JOIN users u ON u.id = (b.metadata->>'user_id')::uuid
          ORDER BY b.created_at DESC
          LIMIT 10
        `),
      ]);

    const m = metrics.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          bookings: {
            current: parseInt(m?.current_bookings ?? '0'),
            previous: parseInt(m?.previous_bookings ?? '0'),
            change: m?.previous_bookings && parseInt(m.previous_bookings) > 0
              ? Math.round(((parseInt(m.current_bookings) - parseInt(m.previous_bookings)) / parseInt(m.previous_bookings)) * 100)
              : 0,
          },
          revenue: {
            current: parseFloat(m?.current_revenue ?? '0'),
            previous: parseFloat(m?.previous_revenue ?? '0'),
            change: m?.previous_revenue && parseFloat(m.previous_revenue) > 0
              ? Math.round(((parseFloat(m.current_revenue) - parseFloat(m.previous_revenue)) / parseFloat(m.previous_revenue)) * 100)
              : 0,
          },
          users: {
            current: parseInt(m?.current_users ?? '0'),
            previous: parseInt(m?.previous_users ?? '0'),
            total: parseInt(m?.total_users ?? '0'),
            change: m?.previous_users && parseInt(m.previous_users) > 0
              ? Math.round(((parseInt(m.current_users) - parseInt(m.previous_users)) / parseInt(m.previous_users)) * 100)
              : 0,
          },
          conversion: {
            rate: parseFloat(m?.conversion_rate ?? '0'),
            usersWithBookings: parseInt(m?.users_with_bookings ?? '0'),
          },
        },
        charts: {
          revenue: revenueChart.rows.map(r => ({
            month: r.month,
            revenue: parseFloat(r.revenue),
          })),
          categories: categoryStats.rows,
          userGrowth: userGrowth.rows.map(r => ({
            date: r.date,
            count: parseInt(r.count),
          })),
        },
        topTours: topTours.rows.map(t => ({
          id: t.id,
          title: t.title,
          bookings: parseInt(t.bookings),
          revenue: parseFloat(t.revenue),
        })),
        recentActivity: recentActivity.rows,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении дашборда', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
