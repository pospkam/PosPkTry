import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types';
import { requireAdmin } from '@/lib/auth/middleware';
import { query } from '@/lib/database';
import { monitoringService } from '@/lib/monitoring';
import {
  CountRow,
  RevenueRow,
  RoleCountRow,
  DailyCountRow,
  DailyRevenueRow,
  TopTourStatsRow,
  TopOperatorRow,
} from '@/lib/types/db-rows';

// GET /api/admin/stats - Получение статистики для админ-панели
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    // Общая статистика
    const [
      totalUsersResult,
      totalToursResult,
      totalBookingsResult,
      totalRevenueResult,
      activeTransfersResult,
      todayBookingsResult,
      lastMonthBookingsResult,
      currentMonthBookingsResult,
    ] = await Promise.all([
      query<CountRow>('SELECT COUNT(*) as count FROM users'),
      query<CountRow>('SELECT COUNT(*) as count FROM tours WHERE is_active = true'),
      query<CountRow>('SELECT COUNT(*) as count FROM bookings'),
      query<RevenueRow>(`SELECT COALESCE(SUM(total_price), 0) as revenue FROM bookings WHERE payment_status = 'paid'`),
      query<CountRow>('SELECT COUNT(*) as count FROM transfer_bookings WHERE status = \'active\''),
      query<CountRow>('SELECT COUNT(*) as count FROM bookings WHERE DATE(created_at) = CURRENT_DATE'),
      query<CountRow>(`
        SELECT COUNT(*) as count
        FROM bookings
        WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '1 month')
          AND created_at < DATE_TRUNC('month', CURRENT_DATE)
      `),
      query<CountRow>(`
        SELECT COUNT(*) as count
        FROM bookings
        WHERE created_at >= DATE_TRUNC('month', CURRENT_DATE)
      `),
    ]);

    const lastMonthCount = parseInt(lastMonthBookingsResult.rows[0]?.count ?? '0', 10);
    const currentMonthCount = parseInt(currentMonthBookingsResult.rows[0]?.count ?? '0', 10);
    const monthlyGrowth = lastMonthCount > 0
      ? Math.round(((currentMonthCount - lastMonthCount) / lastMonthCount) * 100)
      : 0;

    const stats = {
      totalUsers: parseInt(totalUsersResult.rows[0]?.count ?? '0', 10),
      totalTours: parseInt(totalToursResult.rows[0]?.count ?? '0', 10),
      totalBookings: parseInt(totalBookingsResult.rows[0]?.count ?? '0', 10),
      totalRevenue: parseFloat(totalRevenueResult.rows[0]?.revenue ?? '0'),
      activeTransfers: parseInt(activeTransfersResult.rows[0]?.count ?? '0', 10),
      todayBookings: parseInt(todayBookingsResult.rows[0]?.count ?? '0', 10),
      monthlyGrowth,

      usersByRole: await getUsersByRole(),
      dailyBookings: await getDailyBookings(),
      dailyRevenue: await getDailyRevenue(),
      topTours: await getTopTours(),
      topOperators: await getTopOperators(),

      system: {
        uptime: Math.round(process.uptime() / 3600 * 100) / 100,
        avgResponseTime: await getAverageResponseTime(),
        errorRate: await getErrorRate(),
        activeConnections: await getActiveConnections(),
      },
    };

    return NextResponse.json({ success: true, data: stats } as ApiResponse<typeof stats>);

  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении статистики' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

async function getUsersByRole(): Promise<Record<string, number>> {
  const result = await query<RoleCountRow>(`
    SELECT role, COUNT(*) as count
    FROM users
    GROUP BY role
  `);

  const roleMap: Record<string, number> = {
    tourist: 0, operator: 0, guide: 0,
    transfer: 0, agent: 0, admin: 0,
  };

  result.rows.forEach(row => {
    roleMap[row.role] = parseInt(row.count, 10);
  });

  return roleMap;
}

async function getDailyBookings(): Promise<number[]> {
  const result = await query<DailyCountRow>(`
    SELECT DATE(created_at) as date, COUNT(*) as count
    FROM bookings
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);
  return result.rows.map(row => parseInt(row.count, 10));
}

async function getDailyRevenue(): Promise<number[]> {
  const result = await query<DailyRevenueRow>(`
    SELECT DATE(created_at) as date, COALESCE(SUM(total_price), 0) as revenue
    FROM bookings
    WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
      AND payment_status = 'paid'
    GROUP BY DATE(created_at)
    ORDER BY date ASC
  `);
  return result.rows.map(row => parseFloat(row.revenue));
}

async function getTopTours(): Promise<{ id: string; name: string; bookings: number }[]> {
  const result = await query<TopTourStatsRow>(`
    SELECT t.id, t.name, COUNT(b.id) as bookings
    FROM tours t
    LEFT JOIN bookings b ON t.id = b.tour_id
    GROUP BY t.id, t.name
    ORDER BY bookings DESC
    LIMIT 5
  `);
  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    bookings: parseInt(row.bookings, 10),
  }));
}

async function getTopOperators(): Promise<{ id: string; name: string; revenue: number; bookings: number }[]> {
  const result = await query<TopOperatorRow>(`
    SELECT
      p.id,
      p.name,
      COUNT(b.id) as bookings,
      COALESCE(SUM(b.total_price), 0) as revenue
    FROM partners p
    LEFT JOIN tours t ON p.id = t.operator_id
    LEFT JOIN bookings b ON t.id = b.tour_id AND b.payment_status = 'paid'
    WHERE p.category = 'operator'
    GROUP BY p.id, p.name
    ORDER BY revenue DESC
    LIMIT 5
  `);
  return result.rows.map(row => ({
    id: row.id,
    name: row.name,
    revenue: parseFloat(row.revenue),
    bookings: parseInt(row.bookings, 10),
  }));
}

async function getAverageResponseTime(): Promise<number> {
  try {
    // monitoringService.getMetrics() returns system snapshot, not per-request metrics
    const systemMetrics = monitoringService.getMetrics();
    void systemMetrics; // available but per-request timing not tracked here
    return 0;
  } catch {
    return 0;
  }
}

async function getErrorRate(): Promise<number> {
  try {
    const systemMetrics = monitoringService.getMetrics();
    void systemMetrics;
    return 0;
  } catch {
    return 0;
  }
}

async function getActiveConnections(): Promise<number> {
  try {
    const result = await query<CountRow>(`
      SELECT COUNT(*) as count
      FROM sessions
      WHERE expires_at > NOW()
    `);
    return parseInt(result.rows[0]?.count ?? '0', 10);
  } catch {
    return 0;
  }
}
