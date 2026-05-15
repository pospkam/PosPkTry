import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { query } from '@/lib/database';
import {
  FinanceMetricsRow, DailyFinanceRow, RevenueByTypeRow,
  PendingPayoutsRow, RecentTransactionRow, PayoutAdminRow, PayoutStatsRow, PayoutCreateRow,
} from '@/lib/types/db-rows';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const { searchParams } = new URL(request.url);
    const tab = searchParams.get('tab') || 'overview';

    if (tab === 'payouts') {
      const [payoutsResult, statsResult] = await Promise.all([
        query<PayoutAdminRow>(`
          SELECT
            py.id,
            py.partner_id,
            p.name as partner_name,
            p.contact->>'email' as partner_email,
            py.booking_id,
            'tour' as booking_type,
            t.title as service_name,
            py.amount,
            py.currency,
            py.status,
            py.created_at,
            py.updated_at as completed_at,
            NULL::text as failure_reason
          FROM payouts py
          JOIN partners p ON py.partner_id = p.id
          LEFT JOIN operator_bookings b ON py.booking_id = b.id
          LEFT JOIN operator_tours t ON t.id = b.operator_tour_id
          ORDER BY py.created_at DESC
          LIMIT 50
        `),
        query<PayoutStatsRow>(`
          SELECT
            COUNT(*)::text as total_payouts,
            COUNT(*) FILTER (WHERE status = 'completed')::text as completed_payouts,
            COUNT(*) FILTER (WHERE status = 'pending')::text as pending_payouts,
            COALESCE(SUM(amount) FILTER (WHERE status = 'completed'), 0)::text as total_paid,
            COALESCE(SUM(amount) FILTER (WHERE status = 'pending'), 0)::text as pending_amount
          FROM payouts
        `),
      ]);

      return NextResponse.json({
        success: true,
        data: {
          payouts: payoutsResult.rows,
          stats: statsResult.rows[0],
        },
      });
    }

    const [metrics, dailyRevenue, revenueByType, pendingPayouts, recentTransactions] =
      await Promise.all([
        query<FinanceMetricsRow>(`
          SELECT
            COUNT(*)::text as total_transactions,
            COALESCE(SUM(amount), 0)::text as total_revenue,
            COALESCE(AVG(amount), 0)::text as avg_transaction,
            COUNT(DISTINCT user_id)::text as unique_customers
          FROM payments
          WHERE status = 'completed'
        `),
        query<DailyFinanceRow>(`
          SELECT
            DATE(created_at) as date,
            COUNT(*)::text as transactions,
            COALESCE(SUM(amount), 0)::text as revenue
          FROM payments
          WHERE status = 'completed'
            AND created_at >= NOW() - INTERVAL '30 days'
          GROUP BY DATE(created_at)
          ORDER BY date ASC
        `),
        query<RevenueByTypeRow>(`
          SELECT
            booking_type,
            COUNT(*)::text as transactions,
            COALESCE(SUM(amount), 0)::text as revenue
          FROM payments
          WHERE status = 'completed'
          GROUP BY booking_type
        `),
        query<PendingPayoutsRow>(`
          SELECT
            COUNT(*)::text as pending_count,
            COALESCE(SUM(amount), 0)::text as pending_amount
          FROM payouts
          WHERE status = 'pending'
        `),
        query<RecentTransactionRow>(`
          SELECT
            p.id,
            p.amount,
            p.currency,
            p.status,
            p.created_at,
            p.booking_type,
            CASE
              WHEN p.booking_type = 'tour' THEN t.title
              ELSE NULL
            END as service_name,
            u.name as customer_name
          FROM payments p
          LEFT JOIN operator_bookings b ON p.booking_id = b.id AND p.booking_type = 'tour'
          LEFT JOIN operator_tours t ON t.id = b.operator_tour_id
          LEFT JOIN users u ON p.user_id = u.id
          ORDER BY p.created_at DESC
          LIMIT 20
        `),
      ]);

    return NextResponse.json({
      success: true,
      data: {
        metrics: metrics.rows[0],
        dailyRevenue: dailyRevenue.rows,
        revenueByType: revenueByType.rows,
        pendingPayouts: pendingPayouts.rows[0],
        recentTransactions: recentTransactions.rows,
      },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении финансовых данных', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const body = await request.json() as { partnerId?: unknown; bookingId?: unknown; amount?: unknown; currency?: unknown; description?: unknown };
    const { partnerId, bookingId, amount, currency, description } = body;

    if (!partnerId || !bookingId || !amount) {
      return NextResponse.json({ success: false, error: 'Обязательные поля: partnerId, bookingId, amount' }, { status: 400 });
    }

    const result = await query<PayoutCreateRow>(`
      INSERT INTO payouts (partner_id, booking_id, amount, currency, status, description)
      VALUES ($1, $2, $3, $4, 'pending', $5)
      RETURNING id, status, created_at
    `, [partnerId, bookingId, amount, currency || 'RUB', description || 'Выплата оператору']);

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка при создании выплаты', message: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
