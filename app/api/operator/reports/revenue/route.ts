import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { getOperatorPartnerId } from '@/lib/auth/operator-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/operator/reports/revenue
 * Get detailed revenue report
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'operator') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

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
    const groupBy = searchParams.get('groupBy') || 'day'; // day, week, month

    // Get revenue by period
    let dateGrouping;
    switch (groupBy) {
      case 'week':
        dateGrouping = `DATE_TRUNC('week', b.created_at)`;
        break;
      case 'month':
        dateGrouping = `DATE_TRUNC('month', b.created_at)`;
        break;
      default:
        dateGrouping = `DATE(b.created_at)`;
    }

    const revenueResult = await query(
      `SELECT 
        ${dateGrouping} as period,
        COUNT(*) as bookings_count,
        COUNT(DISTINCT b.tour_id) as tours_count,
        SUM(b.total_price) as total_revenue,
        SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_price ELSE 0 END) as paid_revenue,
        SUM(CASE WHEN b.payment_status = 'pending' THEN b.total_price ELSE 0 END) as pending_revenue,
        AVG(b.total_price) as avg_booking_value
      FROM bookings b
      JOIN tours t ON b.tour_id = t.id
      WHERE t.operator_id = $1
        AND b.created_at >= $2
        AND b.created_at <= $3
        AND b.status != 'cancelled'
      GROUP BY period
      ORDER BY period ASC`,
      [operatorId, startDate, endDate]
    );

    // Get revenue by tour
    const byTourResult = await query(
      `SELECT 
        t.id as tour_id,
        t.name as tour_name,
        COUNT(*) as bookings_count,
        SUM(b.total_price) as total_revenue,
        SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_price ELSE 0 END) as paid_revenue,
        AVG(b.total_price) as avg_booking_value
      FROM bookings b
      JOIN tours t ON b.tour_id = t.id
      WHERE t.operator_id = $1
        AND b.created_at >= $2
        AND b.created_at <= $3
        AND b.status != 'cancelled'
      GROUP BY t.id, t.name
      ORDER BY total_revenue DESC
      LIMIT 10`,
      [operatorId, startDate, endDate]
    );

    // Get payment methods distribution
    const paymentStatusResult = await query(
      `SELECT 
        payment_status,
        COUNT(*) as count,
        SUM(total_price) as total
      FROM bookings b
      JOIN tours t ON b.tour_id = t.id
      WHERE t.operator_id = $1
        AND b.created_at >= $2
        AND b.created_at <= $3
        AND b.status != 'cancelled'
      GROUP BY payment_status`,
      [operatorId, startDate, endDate]
    );

    // Get overall summary
    const summaryResult = await query(
      `SELECT 
        COUNT(*) as total_bookings,
        SUM(b.total_price) as total_revenue,
        SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_price ELSE 0 END) as paid_revenue,
        SUM(CASE WHEN b.payment_status = 'pending' THEN b.total_price ELSE 0 END) as pending_revenue,
        SUM(CASE WHEN b.payment_status = 'refunded' THEN b.total_price ELSE 0 END) as refunded_revenue,
        AVG(b.total_price) as avg_booking_value,
        MIN(b.total_price) as min_booking_value,
        MAX(b.total_price) as max_booking_value
      FROM bookings b
      JOIN tours t ON b.tour_id = t.id
      WHERE t.operator_id = $1
        AND b.created_at >= $2
        AND b.created_at <= $3
        AND b.status != 'cancelled'`,
      [operatorId, startDate, endDate]
    );

    const summary = summaryResult.rows[0];

    const report = {
      period: {
        startDate,
        endDate,
        groupBy
      },
      summary: {
        totalBookings: parseInt(summary.total_bookings),
        totalRevenue: parseFloat(summary.total_revenue || 0),
        paidRevenue: parseFloat(summary.paid_revenue || 0),
        pendingRevenue: parseFloat(summary.pending_revenue || 0),
        refundedRevenue: parseFloat(summary.refunded_revenue || 0),
        avgBookingValue: parseFloat(summary.avg_booking_value || 0),
        minBookingValue: parseFloat(summary.min_booking_value || 0),
        maxBookingValue: parseFloat(summary.max_booking_value || 0)
      },
      timeline: revenueResult.rows.map(row => ({
        period: row.period,
        bookingsCount: parseInt(row.bookings_count),
        toursCount: parseInt(row.tours_count),
        totalRevenue: parseFloat(row.total_revenue),
        paidRevenue: parseFloat(row.paid_revenue),
        pendingRevenue: parseFloat(row.pending_revenue),
        avgBookingValue: parseFloat(row.avg_booking_value)
      })),
      byTour: byTourResult.rows.map(row => ({
        tourId: row.tour_id,
        tourName: row.tour_name,
        bookingsCount: parseInt(row.bookings_count),
        totalRevenue: parseFloat(row.total_revenue),
        paidRevenue: parseFloat(row.paid_revenue),
        avgBookingValue: parseFloat(row.avg_booking_value)
      })),
      paymentStatus: paymentStatusResult.rows.map(row => ({
        status: row.payment_status,
        count: parseInt(row.count),
        total: parseFloat(row.total)
      }))
    };

    return NextResponse.json({
      success: true,
      data: report
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get revenue report error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при формировании отчета'
    } as ApiResponse<null>, { status: 500 });
  }
}
