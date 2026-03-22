import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAdmin } from '@/lib/auth/middleware';
import {
  FinanceMetricsRow,
  DailyFinanceRow,
  RevenueByTypeRow,
  PendingPayoutsRow,
  RecentTransactionRow,
} from '@/lib/types/db-rows';

export const dynamic = 'force-dynamic';

/** Ставка комиссии платформы. Берётся из env, fallback 15% */
const PLATFORM_COMMISSION_RATE = Math.max(
  0,
  Math.min(1, parseFloat(process.env.PLATFORM_COMMISSION_RATE ?? '0.15'))
);

const ALLOWED_BOOKING_TYPES = new Set(['all', 'tours', 'accommodations', 'transfers']);

/**
 * GET /api/admin/finance - Финансовая аналитика для Admin Panel
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const userOrResponse = await requireAdmin(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;

    const { searchParams } = new URL(request.url);

    // Whitelist period: только положительное целое число (1–365)
    const rawPeriod = searchParams.get('period') ?? '30';
    const periodDays = Math.max(1, Math.min(365, parseInt(rawPeriod, 10) || 30));

    // Whitelist type: только допустимые значения — SQL injection prevention
    const rawType = searchParams.get('type') ?? 'all';
    const type = ALLOWED_BOOKING_TYPES.has(rawType) ? rawType : 'all';
    const filterByType = type !== 'all';

    // Основные метрики
    const metricsResult = await query<FinanceMetricsRow>(
      `SELECT
        COUNT(*) as total_transactions,
        COALESCE(SUM(amount), 0) as total_revenue,
        COALESCE(AVG(amount), 0) as avg_transaction,
        COUNT(DISTINCT user_id) as unique_customers
       FROM payments
       WHERE status = 'completed'
         AND created_at >= NOW() - ($1 * INTERVAL '1 day')
         ${filterByType ? 'AND booking_type = $2' : ''}`,
      filterByType ? [periodDays, type] : [periodDays]
    );
    const metrics = metricsResult.rows[0];

    // Доходы по дням (последние 30 дней)
    const dailyRevenueResult = await query<DailyFinanceRow>(
      `SELECT
        DATE(created_at) as date,
        COUNT(*) as transactions,
        COALESCE(SUM(amount), 0) as revenue
       FROM payments
       WHERE status = 'completed'
         AND created_at >= NOW() - INTERVAL '30 days'
         ${filterByType ? 'AND booking_type = $1' : ''}
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      filterByType ? [type] : []
    );

    // Доходы по типам услуг
    const revenueByTypeResult = await query<RevenueByTypeRow>(
      `SELECT
        booking_type,
        COUNT(*) as transactions,
        COALESCE(SUM(amount), 0) as revenue
       FROM payments
       WHERE status = 'completed'
         AND created_at >= NOW() - ($1 * INTERVAL '1 day')
       GROUP BY booking_type
       ORDER BY revenue DESC`,
      [periodDays]
    );

    // Выплаты партнерам (ожидающие)
    const pendingPayoutsResult = await query<PendingPayoutsRow>(
      `SELECT
        COUNT(*) as pending_count,
        COALESCE(SUM(amount * $1::numeric), 0) as pending_amount
       FROM payments p
       JOIN bookings b ON p.booking_id = b.id
       WHERE p.status = 'completed'
         AND b.status = 'confirmed'
         AND NOT EXISTS (
           SELECT 1 FROM payouts
           WHERE booking_id = b.id
           AND status = 'completed'
         )`,
      [PLATFORM_COMMISSION_RATE]
    );
    const pendingPayouts = pendingPayoutsResult.rows[0];

    // Недавние транзакции
    const recentTransactionsResult = await query<RecentTransactionRow>(
      `SELECT
        p.id,
        p.amount,
        p.currency,
        p.status,
        p.created_at,
        p.booking_type,
        COALESCE(t.name, a.name, tr.id::text) as service_name,
        COALESCE(u.name, 'Неизвестный') as customer_name
       FROM payments p
       LEFT JOIN bookings b ON p.booking_id = b.id AND p.booking_type = 'tour'
       LEFT JOIN tours t ON b.tour_id = t.id
       LEFT JOIN accommodation_bookings ab ON p.booking_id = ab.id AND p.booking_type = 'accommodation'
       LEFT JOIN accommodations a ON ab.accommodation_id = a.id
       LEFT JOIN transfer_bookings tb ON p.booking_id = tb.id AND p.booking_type = 'transfer'
       LEFT JOIN transfers tr ON tb.transfer_id = tr.id
       LEFT JOIN users u ON p.user_id = u.id
       ORDER BY p.created_at DESC
       LIMIT 20`
    );

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          totalTransactions: parseInt(metrics.total_transactions),
          totalRevenue: parseFloat(metrics.total_revenue),
          avgTransaction: parseFloat(metrics.avg_transaction),
          uniqueCustomers: parseInt(metrics.unique_customers),
          period: periodDays
        },
        dailyRevenue: dailyRevenueResult.rows.map(row => ({
          date: row.date,
          transactions: parseInt(row.transactions),
          revenue: parseFloat(row.revenue)
        })),
        revenueByType: revenueByTypeResult.rows.map(row => ({
          type: row.booking_type,
          transactions: parseInt(row.transactions),
          revenue: parseFloat(row.revenue)
        })),
        pendingPayouts: {
          count: parseInt(pendingPayouts.pending_count),
          amount: parseFloat(pendingPayouts.pending_amount)
        },
        recentTransactions: recentTransactionsResult.rows.map(row => ({
          id: row.id,
          amount: parseFloat(row.amount),
          currency: row.currency,
          status: row.status,
          createdAt: row.created_at,
          bookingType: row.booking_type,
          serviceName: row.service_name,
          customerName: row.customer_name
        }))
      }
    } as ApiResponse<unknown>);

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении финансовых данных'
    } as ApiResponse<null>, { status: 500 });
  }
}
