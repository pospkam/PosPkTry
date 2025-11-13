import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAdmin } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/finance - Финансовая аналитика для Admin Panel
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAdmin(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;
    
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || '30'; // дни
    const type = searchParams.get('type') || 'all'; // all, tours, accommodations, transfers

    // Основные метрики
    const metricsQuery = `
      SELECT
        COUNT(*) as total_transactions,
        COALESCE(SUM(amount), 0) as total_revenue,
        COALESCE(AVG(amount), 0) as avg_transaction,
        COUNT(DISTINCT user_id) as unique_customers
      FROM payments
      WHERE status = 'completed'
        AND created_at >= NOW() - INTERVAL '${period} days'
        ${type !== 'all' ? `AND booking_type = '${type}'` : ''}
    `;

    const metricsResult = await query(metricsQuery);
    const metrics = metricsResult.rows[0];

    // Доходы по дням (последние 30 дней)
    const dailyRevenueQuery = `
      SELECT
        DATE(created_at) as date,
        COUNT(*) as transactions,
        COALESCE(SUM(amount), 0) as revenue
      FROM payments
      WHERE status = 'completed'
        AND created_at >= NOW() - INTERVAL '30 days'
        ${type !== 'all' ? `AND booking_type = '${type}'` : ''}
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `;

    const dailyRevenueResult = await query(dailyRevenueQuery);

    // Доходы по типам услуг
    const revenueByTypeQuery = `
      SELECT
        booking_type,
        COUNT(*) as transactions,
        COALESCE(SUM(amount), 0) as revenue
      FROM payments
      WHERE status = 'completed'
        AND created_at >= NOW() - INTERVAL '${period} days'
      GROUP BY booking_type
      ORDER BY revenue DESC
    `;

    const revenueByTypeResult = await query(revenueByTypeQuery);

    // Выплаты партнерам (ожидающие)
    const pendingPayoutsQuery = `
      SELECT
        COUNT(*) as pending_count,
        COALESCE(SUM(amount * 0.15), 0) as pending_amount -- 15% комиссия
      FROM payments p
      JOIN bookings b ON p.booking_id = b.id
      WHERE p.status = 'completed'
        AND b.status = 'confirmed'
        AND NOT EXISTS (
          SELECT 1 FROM payouts
          WHERE booking_id = b.id
          AND status = 'completed'
        )
    `;

    const pendingPayoutsResult = await query(pendingPayoutsQuery);
    const pendingPayouts = pendingPayoutsResult.rows[0];

    // Недавние транзакции
    const recentTransactionsQuery = `
      SELECT
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
      LEFT JOIN users u ON p.user_id = u.id
      ORDER BY p.created_at DESC
      LIMIT 20
    `;

    const recentTransactionsResult = await query(recentTransactionsQuery);

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          totalTransactions: parseInt(metrics.total_transactions),
          totalRevenue: parseFloat(metrics.total_revenue),
          avgTransaction: parseFloat(metrics.avg_transaction),
          uniqueCustomers: parseInt(metrics.unique_customers),
          period: period
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
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error fetching admin finance data:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении финансовых данных'
    } as ApiResponse<null>, { status: 500 });
  }
}
