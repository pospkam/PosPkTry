import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireOperator } from '@/lib/auth/middleware';
import { getOperatorPartnerId } from '@/lib/auth/operator-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/operator/reports/bookings
 * Get detailed bookings analytics report
 */
export async function GET(request: NextRequest) {
  try {
    const operatorOrResponse = await requireOperator(request);
    if (operatorOrResponse instanceof NextResponse) {
      return operatorOrResponse;
    }
    const userId = operatorOrResponse.userId;

    const operatorId = await getOperatorPartnerId(userId);
    
    if (!operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Профиль оператора не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const endDate = searchParams.get('endDate') || new Date().toISOString();

    // Bookings by status
    const statusResult = await query(
      `SELECT 
        status,
        COUNT(*) as count,
        SUM(total_price) as revenue
      FROM bookings b
      JOIN tours t ON b.tour_id = t.id
      WHERE t.operator_id = $1
        AND b.created_at >= $2
        AND b.created_at <= $3
      GROUP BY status`,
      [operatorId, startDate, endDate]
    );

    // Conversion funnel
    const funnelResult = await query(
      `WITH funnel AS (
        SELECT 
          COUNT(*) FILTER (WHERE status = 'pending') as pending,
          COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed,
          COUNT(*) FILTER (WHERE status = 'completed') as completed,
          COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled
        FROM bookings b
        JOIN tours t ON b.tour_id = t.id
        WHERE t.operator_id = $1
          AND b.created_at >= $2
          AND b.created_at <= $3
      )
      SELECT 
        pending,
        confirmed,
        completed,
        cancelled,
        CASE WHEN pending > 0 THEN (confirmed::FLOAT / pending * 100) ELSE 0 END as confirmation_rate,
        CASE WHEN confirmed > 0 THEN (completed::FLOAT / confirmed * 100) ELSE 0 END as completion_rate,
        CASE WHEN (pending + confirmed) > 0 THEN (cancelled::FLOAT / (pending + confirmed) * 100) ELSE 0 END as cancellation_rate
      FROM funnel`,
      [operatorId, startDate, endDate]
    );

    // Lead time analysis
    const leadTimeResult = await query(
      `SELECT 
        AVG(EXTRACT(DAY FROM (start_date - created_at::DATE))) as avg_lead_time_days,
        MIN(EXTRACT(DAY FROM (start_date - created_at::DATE))) as min_lead_time_days,
        MAX(EXTRACT(DAY FROM (start_date - created_at::DATE))) as max_lead_time_days
      FROM bookings b
      JOIN tours t ON b.tour_id = t.id
      WHERE t.operator_id = $1
        AND b.created_at >= $2
        AND b.created_at <= $3
        AND b.start_date IS NOT NULL
        AND b.status != 'cancelled'`,
      [operatorId, startDate, endDate]
    );

    // Guests distribution
    const guestsResult = await query(
      `SELECT 
        CASE 
          WHEN COALESCE(guests_count, participants) = 1 THEN '1'
          WHEN COALESCE(guests_count, participants) BETWEEN 2 AND 4 THEN '2-4'
          WHEN COALESCE(guests_count, participants) BETWEEN 5 AND 10 THEN '5-10'
          ELSE '10+'
        END as group_size,
        COUNT(*) as count
      FROM bookings b
      JOIN tours t ON b.tour_id = t.id
      WHERE t.operator_id = $1
        AND b.created_at >= $2
        AND b.created_at <= $3
        AND b.status != 'cancelled'
      GROUP BY group_size
      ORDER BY group_size`,
      [operatorId, startDate, endDate]
    );

    // Repeat customers
    const repeatCustomersResult = await query(
      `SELECT 
        COUNT(DISTINCT user_id) as total_customers,
        COUNT(DISTINCT CASE WHEN booking_count > 1 THEN user_id END) as repeat_customers
      FROM (
        SELECT 
          b.user_id,
          COUNT(*) as booking_count
        FROM bookings b
        JOIN tours t ON b.tour_id = t.id
        WHERE t.operator_id = $1
          AND b.created_at >= $2
          AND b.created_at <= $3
          AND b.status != 'cancelled'
        GROUP BY b.user_id
      ) customer_bookings`,
      [operatorId, startDate, endDate]
    );

    const funnel = funnelResult.rows[0];
    const leadTime = leadTimeResult.rows[0];
    const repeatCustomers = repeatCustomersResult.rows[0];

    const report = {
      period: {
        startDate,
        endDate
      },
      statusDistribution: statusResult.rows.map(row => ({
        status: row.status,
        count: parseInt(row.count),
        revenue: parseFloat(row.revenue || 0)
      })),
      conversionFunnel: {
        pending: parseInt(funnel.pending),
        confirmed: parseInt(funnel.confirmed),
        completed: parseInt(funnel.completed),
        cancelled: parseInt(funnel.cancelled),
        confirmationRate: parseFloat(funnel.confirmation_rate).toFixed(2),
        completionRate: parseFloat(funnel.completion_rate).toFixed(2),
        cancellationRate: parseFloat(funnel.cancellation_rate).toFixed(2)
      },
      leadTime: {
        avgDays: parseFloat(leadTime.avg_lead_time_days || 0).toFixed(1),
        minDays: parseInt(leadTime.min_lead_time_days || 0),
        maxDays: parseInt(leadTime.max_lead_time_days || 0)
      },
      guestsDistribution: guestsResult.rows.map(row => ({
        groupSize: row.group_size,
        count: parseInt(row.count)
      })),
      customers: {
        total: parseInt(repeatCustomers.total_customers),
        repeat: parseInt(repeatCustomers.repeat_customers),
        repeatRate: repeatCustomers.total_customers > 0 
          ? ((repeatCustomers.repeat_customers / repeatCustomers.total_customers) * 100).toFixed(2)
          : '0.00'
      }
    };

    return NextResponse.json({
      success: true,
      data: report
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get bookings report error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при формировании отчета'
    } as ApiResponse<null>, { status: 500 });
  }
}
