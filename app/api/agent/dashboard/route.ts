import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse, AgentDashboardData, AgentClient } from '@/types';
import { requireAgent } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agent/dashboard - Dashboard данные для агента
 * Получает метрики, недавние бронирования, клиентов и графики
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAgent(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;
    
    const agentId = userOrResponse.userId;

    const { searchParams } = new URL(request.url);
    const ALLOWED_PERIODS = ['7', '30', '90', '365'] as const;
    type AllowedPeriod = typeof ALLOWED_PERIODS[number];
    const rawPeriod = searchParams.get('period') || '30';
    const period: AllowedPeriod = (ALLOWED_PERIODS as readonly string[]).includes(rawPeriod)
      ? (rawPeriod as AllowedPeriod)
      : '30';

    // Метрики агента
    const metricsQuery = `
      SELECT
        COUNT(DISTINCT c.id) as total_clients,
        COUNT(DISTINCT CASE WHEN c.status = 'active' THEN c.id END) as active_clients,
        COUNT(b.id) as total_bookings,
        COUNT(CASE WHEN b.status = 'pending' THEN 1 END) as pending_bookings,
        COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
        COUNT(CASE WHEN b.status = 'completed' THEN 1 END) as completed_bookings,
        COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
        COALESCE(SUM(b.total_price), 0) as total_revenue,
        COALESCE(SUM(CASE WHEN b.created_at >= DATE_TRUNC('month', NOW()) THEN b.total_price END), 0) as monthly_revenue,
        COALESCE(AVG(b.total_price), 0) as avg_booking_value,
        COALESCE(SUM(b.agent_commission), 0) as total_commission,
        COALESCE(SUM(CASE WHEN b.commission_status = 'pending' THEN b.agent_commission END), 0) as pending_commission
      FROM agent_clients c
      LEFT JOIN agent_bookings b ON c.id = b.client_id AND b.agent_id = $1
      WHERE c.agent_id = $1
        AND c.created_at >= NOW() - ($2::int * INTERVAL '1 day')
    `;

    const metricsResult = await query<{
      total_clients: string; active_clients: string; total_bookings: string;
      pending_bookings: string; confirmed_bookings: string; completed_bookings: string;
      cancelled_bookings: string; total_revenue: string; monthly_revenue: string; avg_booking_value: string;
      total_commission: string; pending_commission: string;
    }>(metricsQuery, [agentId, parseInt(period)]);
    const metrics = metricsResult.rows[0];

    // Расчет конверсии (отношение завершенных бронирований к общему числу)
    const totalBookingsNum = parseInt(metrics.total_bookings);
    const completedBookingsNum = parseInt(metrics.completed_bookings);
    const conversionRate = totalBookingsNum > 0
      ? (completedBookingsNum / totalBookingsNum) * 100
      : 0;

    // Недавние бронирования (последние 10)
    const recentBookingsQuery = `
      SELECT
        b.id,
        b.client_id,
        c.name as client_name,
        c.email as client_email,
        b.tour_id,
        t.title as tour_name,
        p.company_name as tour_operator,
        b.booking_date,
        b.tour_date,
        b.guests_count,
        b.total_price,
        b.agent_commission,
        b.commission_status,
        b.status,
        b.payment_status,
        b.notes,
        b.created_at,
        b.updated_at
      FROM agent_bookings b
      JOIN agent_clients c ON b.client_id = c.id
      JOIN operator_tours t ON b.tour_id = t.id
      JOIN partners p ON t.operator_id = p.id
      WHERE b.agent_id = $1
      ORDER BY b.created_at DESC
      LIMIT 10
    `;

    const recentBookingsResult = await query<{
      id: string; client_id: string; client_name: string; client_email: string;
      tour_id: string; tour_name: string; tour_operator: string;
      booking_date: unknown; tour_date: unknown; guests_count: unknown;
      total_price: string; agent_commission: string; commission_status: unknown;
      status: unknown; payment_status: unknown; notes: unknown;
      created_at: unknown; updated_at: unknown;
    }>(recentBookingsQuery, [agentId]);

    // Недавние клиенты (последние 5)
    const recentClientsQuery = `
      SELECT
        id,
        name,
        email,
        phone,
        company,
        total_bookings,
        total_spent,
        last_booking,
        status,
        notes,
        tags,
        source,
        created_at,
        updated_at
      FROM agent_clients
      WHERE agent_id = $1
      ORDER BY created_at DESC
      LIMIT 5
    `;

    const recentClientsResult = await query<{
      id: string; name: string; email: string; phone: string | null; company: string | null;
      total_bookings: string; total_spent: string; last_booking: unknown;
      status: string; notes: string | null; tags: string | null; source: string;
      created_at: unknown; updated_at: unknown;
    }>(recentClientsQuery, [agentId]);

    // Предстоящие бронирования (на ближайшие 7 дней)
    const upcomingBookingsQuery = `
      SELECT
        b.id,
        c.name as client_name,
        t.title as tour_name,
        b.tour_date,
        b.total_price,
        b.agent_commission
      FROM agent_bookings b
      JOIN agent_clients c ON b.client_id = c.id
      JOIN operator_tours t ON b.tour_id = t.id
      WHERE b.agent_id = $1
        AND b.status = 'confirmed'
        AND b.tour_date >= NOW()
        AND b.tour_date <= NOW() + INTERVAL '7 days'
      ORDER BY b.tour_date ASC
      LIMIT 10
    `;

    const upcomingBookingsResult = await query<{
      id: string; client_name: string; tour_name: string; tour_date: unknown;
      total_price: string; agent_commission: string;
    }>(upcomingBookingsQuery, [agentId]);

    // График доходов за последние 30 дней
    const revenueChartQuery = `
      SELECT
        DATE(b.created_at) as date,
        COALESCE(SUM(b.total_price), 0) as revenue,
        COALESCE(SUM(b.agent_commission), 0) as commission
      FROM agent_bookings b
      WHERE b.agent_id = $1
        AND b.status IN ('confirmed', 'completed')
        AND b.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(b.created_at)
      ORDER BY date DESC
    `;

    const revenueChartResult = await query<{
      date: unknown; revenue: string; commission: string;
    }>(revenueChartQuery, [agentId]);

    // График комиссий за последние 30 дней
    const commissionChartQuery = `
      SELECT
        DATE(b.created_at) as date,
        COALESCE(SUM(b.agent_commission), 0) as amount
      FROM agent_bookings b
      WHERE b.agent_id = $1
        AND b.commission_status = 'paid'
        AND b.created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(b.created_at)
      ORDER BY date DESC
    `;

    const commissionChartResult = await query<{
      date: unknown; amount: string;
    }>(commissionChartQuery, [agentId]);

    // Ожидающие выплаты комиссий
    const pendingCommissionsQuery = `
      SELECT
        cp.id,
        cp.agent_id,
        a.name as agent_name,
        cp.total_amount,
        cp.status,
        cp.payment_method,
        cp.payout_date,
        cp.created_at,
        cp.updated_at
      FROM commission_payouts cp
      JOIN users a ON cp.agent_id = a.id
      WHERE cp.agent_id = $1
        AND cp.status IN ('pending', 'processing')
      ORDER BY cp.created_at DESC
      LIMIT 5
    `;

    // Отдельные позиции комиссий (нет FK на payout — присваиваем к pending выплатам)
    const pendingCommissionItemsQuery = `
      SELECT
        ac.id, ac.agent_id, ac.booking_id, ac.amount::text, ac.rate::text,
        ac.status, ac.paid_at, ac.payout_reference, ac.notes, ac.created_at, ac.updated_at
      FROM agent_commissions ac
      WHERE ac.agent_id = $1 AND ac.status = 'pending'
      ORDER BY ac.created_at DESC
      LIMIT 50
    `;

    const [pendingCommissionsResult, pendingCommissionItemsResult] = await Promise.all([
      query<{
        id: string; agent_id: string; agent_name: string; total_amount: string;
        status: string; payment_method: unknown; payout_date: unknown;
        created_at: unknown; updated_at: unknown;
      }>(pendingCommissionsQuery, [agentId]),
      query<{
        id: string; agent_id: string; booking_id: string; amount: string; rate: string;
        status: string; paid_at: unknown; payout_reference: unknown; notes: unknown;
        created_at: unknown; updated_at: unknown;
      }>(pendingCommissionItemsQuery, [agentId]),
    ]);

    const commissionItems = pendingCommissionItemsResult.rows.map(r => ({
      id: r.id,
      agentId: r.agent_id,
      bookingId: r.booking_id,
      amount: parseFloat(r.amount),
      rate: parseFloat(r.rate),
      status: r.status,
      paidAt: r.paid_at,
      payoutReference: r.payout_reference,
      notes: r.notes,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
    }));

    const dashboardData: AgentDashboardData = {
      metrics: {
        totalClients: parseInt(metrics.total_clients),
        activeClients: parseInt(metrics.active_clients),
        totalBookings: parseInt(metrics.total_bookings),
        pendingBookings: parseInt(metrics.pending_bookings),
        confirmedBookings: parseInt(metrics.confirmed_bookings),
        completedBookings: parseInt(metrics.completed_bookings),
        cancelledBookings: parseInt(metrics.cancelled_bookings),
        totalRevenue: parseFloat(metrics.total_revenue),
        monthlyRevenue: parseFloat(metrics.monthly_revenue),
        totalCommission: parseFloat(metrics.total_commission),
        pendingCommission: parseFloat(metrics.pending_commission),
        averageBookingValue: parseFloat(metrics.avg_booking_value),
        conversionRate: parseFloat(conversionRate.toFixed(2))
      },
      recentBookings: recentBookingsResult.rows.map(row => ({
        id: row.id,
        clientId: row.client_id,
        clientName: row.client_name,
        clientEmail: row.client_email,
        tourId: row.tour_id,
        tourName: row.tour_name,
        tourOperator: row.tour_operator,
        bookingDate: row.booking_date,
        tourDate: row.tour_date,
        guestsCount: row.guests_count,
        totalPrice: parseFloat(row.total_price),
        agentCommission: parseFloat(row.agent_commission),
        commissionStatus: row.commission_status,
        status: row.status,
        paymentStatus: row.payment_status,
        notes: row.notes,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      })),
      recentClients: recentClientsResult.rows.map(row => ({
        id: row.id,
        name: row.name,
        email: row.email,
        phone: row.phone ?? undefined,
        company: row.company ?? undefined,
        totalBookings: parseInt(row.total_bookings),
        totalSpent: parseFloat(row.total_spent),
        lastBooking: row.last_booking,
        status: row.status as AgentClient['status'],
        notes: row.notes ?? undefined,
        tags: JSON.parse(row.tags || '[]'),
        source: row.source,
        createdAt: row.created_at as Date | undefined,
        updatedAt: row.updated_at as Date | undefined
      })),
      upcomingBookings: upcomingBookingsResult.rows.map(row => ({
        id: row.id,
        clientName: row.client_name,
        tourName: row.tour_name,
        tourDate: row.tour_date,
        totalPrice: parseFloat(row.total_price),
        commission: parseFloat(row.agent_commission)
      })),
      revenueChart: revenueChartResult.rows.map(row => ({
        date: row.date,
        revenue: parseFloat(row.revenue),
        commission: parseFloat(row.commission)
      })),
      commissionChart: commissionChartResult.rows.map(row => ({
        date: row.date,
        amount: parseFloat(row.amount)
      })),
      pendingCommissions: pendingCommissionsResult.rows.map(row => ({
        id: row.id,
        agentId: row.agent_id,
        agentName: row.agent_name,
        totalAmount: parseFloat(row.total_amount),
        commissions: commissionItems,
        status: row.status,
        paymentMethod: row.payment_method,
        payoutDate: row.payout_date,
        completedAt: row.updated_at,
        createdAt: row.created_at,
        updatedAt: row.updated_at
      }))
    };

    return NextResponse.json({
      success: true,
      data: dashboardData
    } as ApiResponse<AgentDashboardData>);

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении данных dashboard'
    } as ApiResponse<null>, { status: 500 });
  }
}
