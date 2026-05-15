import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { query } from '@/lib/database';
import {
  CountRow, RoleCountRow, DailyCountRow, DailyRevenueRow,
  TopTourStatsRow, TopOperatorRow,
} from '@/lib/types/db-rows';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const [
      totalUsers, usersByRole, newUsersToday,
      totalBookings, bookingsByStatus, newBookingsToday, recentRevenue,
      totalTours, activeTours,
      topTours, topOperators,
    ] = await Promise.all([
      query<CountRow>('SELECT COUNT(*) as count FROM users'),
      query<RoleCountRow>('SELECT role, COUNT(*) as count FROM users GROUP BY role'),
      query<CountRow>("SELECT COUNT(*) as count FROM users WHERE created_at >= NOW() - INTERVAL '24 hours'"),
      query<CountRow>('SELECT COUNT(*) as count FROM operator_bookings'),
      query<RoleCountRow>('SELECT booking_status as role, COUNT(*) as count FROM operator_bookings GROUP BY booking_status'),
      query<CountRow>("SELECT COUNT(*) as count FROM operator_bookings WHERE created_at >= NOW() - INTERVAL '24 hours'"),
      query<{ revenue: string }>("SELECT COALESCE(SUM(COALESCE(final_price, base_total_price)), 0)::text as revenue FROM operator_bookings WHERE booking_status = 'confirmed' AND created_at >= NOW() - INTERVAL '30 days'"),
      query<CountRow>('SELECT COUNT(*) as count FROM operator_tours'),
      query<CountRow>('SELECT COUNT(*) as count FROM operator_tours WHERE is_active = true'),
      query<TopTourStatsRow>(`
        SELECT t.id, t.title AS name, COUNT(b.id)::text as bookings
        FROM operator_tours t
        LEFT JOIN operator_bookings b ON b.operator_tour_id = t.id
        GROUP BY t.id, t.title
        ORDER BY bookings DESC LIMIT 5
      `),
      query<TopOperatorRow>(`
        SELECT
          p.id, p.name,
          COALESCE(SUM(COALESCE(b.final_price, b.base_total_price)), 0)::text as revenue,
          COUNT(b.id)::text as bookings
        FROM partners p
        LEFT JOIN operator_tours t ON t.operator_id = p.id
        LEFT JOIN operator_bookings b ON b.operator_tour_id = t.id AND b.booking_status = 'confirmed'
        WHERE p.category = 'operator'
        GROUP BY p.id, p.name
        ORDER BY revenue DESC LIMIT 5
      `),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        users: {
          total: parseInt(totalUsers.rows[0].count),
          byRole: Object.fromEntries(usersByRole.rows.map(r => [r.role, parseInt(r.count)])),
          newToday: parseInt(newUsersToday.rows[0].count),
        },
        bookings: {
          total: parseInt(totalBookings.rows[0].count),
          byStatus: Object.fromEntries(bookingsByStatus.rows.map(r => [r.role, parseInt(r.count)])),
          newToday: parseInt(newBookingsToday.rows[0].count),
          recentRevenue: parseFloat(recentRevenue.rows[0].revenue),
        },
        tours: {
          total: parseInt(totalTours.rows[0].count),
          active: parseInt(activeTours.rows[0].count),
        },
        topTours: topTours.rows,
        topOperators: topOperators.rows,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка получения статистики', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
