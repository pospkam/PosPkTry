import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse, AgentDashboardData } from '@/types';
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
    const period = searchParams.get('period') || '30'; // дни

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
        COALESCE(AVG(b.total_price), 0) as avg_booking_value,
        COALESCE(SUM(b.agent_commission), 0) as total_commission,
        COALESCE(SUM(CASE WHEN b.commission_status = 'pending' THEN b.agent_commission END), 0) as pending_commission
      FROM agent_clients c
      LEFT JOIN agent_bookings b ON c.id = b.client_id AND b.agent_id = $1
      WHERE c.agent_id = $1
        AND c.created_at >= NOW() - INTERVAL '${period} days'
    `;

    const metricsResult = await query(metricsQuery, [agentId]);
    const metrics = metricsResult.rows[0];

    // Расчет конверсии (отношение завершенных бронирований к общему числу)
    const conversionRate = metrics.total_bookings > 0
      ? (metrics.completed_bookings / metrics.total_bookings) * 100
      : 0;

    // Недавние бронирования (последние 10)
    const recentBookingsQuery = `
      SELECT
        b.id,
        b.client_id,
        c.name as client_name,
        c.email as client_email,
        b.tour_id,
        t.name as tour_name,
        p.name as tour_operator,
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
      JOIN tours t ON b.tour_id = t.id
      JOIN partners p ON t.operator_id = p.id
      WHERE b.agent_id = $1
      ORDER BY b.created_at DESC
      LIMIT 10
    `;

    const recentBookingsResult = await query(recentBookingsQuery, [agentId]);

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

    const recentClientsResult = await query(recentClientsQuery, [agentId]);

    // Предстоящие бронирования (на ближайшие 7 дней)
    const upcomingBookingsQuery = `
      SELECT
        b.id,
        c.name as client_name,
        t.name as tour_name,
        b.tour_date,
        b.total_price,
        b.agent_commission
      FROM agent_bookings b
      JOIN agent_clients c ON b.client_id = c.id
      JOIN tours t ON b.tour_id = t.id
      WHERE b.agent_id = $1
        AND b.status = 'confirmed'
        AND b.tour_date >= NOW()
        AND b.tour_date <= NOW() + INTERVAL '7 days'
      ORDER BY b.tour_date ASC
      LIMIT 10
    `;

    const upcomingBookingsResult = await query(upcomingBookingsQuery, [agentId]);

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

    const revenueChartResult = await query(revenueChartQuery, [agentId]);

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

    const commissionChartResult = await query(commissionChartQuery, [agentId]);

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
      JOIN agents a ON cp.agent_id = a.id
      WHERE cp.agent_id = $1
        AND cp.status IN ('pending', 'processing')
      ORDER BY cp.created_at DESC
      LIMIT 5
    `;

    const pendingCommissionsResult = await query(pendingCommissionsQuery, [agentId]);

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
        monthlyRevenue: parseFloat(metrics.total_revenue), // TODO: рассчитать за месяц
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
        phone: row.phone,
        company: row.company,
        totalBookings: parseInt(row.total_bookings),
        totalSpent: parseFloat(row.total_spent),
        lastBooking: row.last_booking,
        status: row.status,
        notes: row.notes,
        tags: JSON.parse(row.tags || '[]'),
        source: row.source,
        createdAt: row.created_at,
        updatedAt: row.updated_at
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
        commissions: [], // TODO: загрузить связанные комиссии
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
    console.error('Error fetching agent dashboard data:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении данных dashboard'
    } as ApiResponse<null>, { status: 500 });
  }
}
