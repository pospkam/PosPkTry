/**
 * GET /api/operator/analytics
 * Analytics data for operator: revenue, conversions, top tours
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { requireOperator } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const userOrResponse = await requireOperator(request);
  if (userOrResponse instanceof NextResponse) {
    return userOrResponse;
  }

  const userId = userOrResponse.userId;
  const { searchParams } = new URL(request.url);
  const periodDays = parseInt(searchParams.get('period') ?? '30', 10);

  try {
    // Resolve userId → partnerId (operator_tours.operator_id is partners.id)
    const partnerRes = await pool.query<{ id: string }>(
      `SELECT id FROM partners WHERE user_id = $1 LIMIT 1`,
      [userId]
    );
    const partnerId = partnerRes.rows[0]?.id;
    if (!partnerId) {
      return NextResponse.json({
        success: true,
        data: {
          period: { days: periodDays, start: '', end: '' },
          summary: { totalRevenue: 0, totalBookings: 0, avgBookingValue: 0, completedBookings: 0 },
          revenue: [],
          topTours: [],
          conversion: { pageViews: 0, bookings: 0, rate: 0 },
          statusBreakdown: {},
        },
      });
    }

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - periodDays);

    // 1. Revenue by month (through operator_tours for operator scoping)
    const { rows: revenueData } = await pool.query<{
      month: string;
      total_revenue: string;
      booking_count: string;
    }>(
      `SELECT
         DATE_TRUNC('month', tp.paid_at)::date AS month,
         SUM(tp.amount) as total_revenue,
         COUNT(DISTINCT ob.id) as booking_count
       FROM tour_payments tp
       JOIN operator_bookings ob ON ob.id = tp.booking_id
       JOIN operator_tours ot ON ot.id = ob.operator_tour_id
       WHERE ot.operator_id = $1 AND tp.paid_at >= $2 AND tp.status = 'RELEASED'
         AND ob.deleted_at IS NULL
       GROUP BY DATE_TRUNC('month', tp.paid_at)
       ORDER BY month DESC`,
      [partnerId, startDate.toISOString()]
    );

    // 2. Top tours by bookings
    const { rows: topTours } = await pool.query<{
      tour_id: string;
      tour_title: string;
      booking_count: string;
      total_revenue: string;
      avg_price: string;
    }>(
      `SELECT
         ot.id as tour_id,
         ot.title as tour_title,
         COUNT(ob.id) as booking_count,
         COALESCE(SUM(tp.amount), 0) as total_revenue,
         COALESCE(AVG(ob.final_price), 0) as avg_price
       FROM operator_tours ot
       LEFT JOIN operator_bookings ob ON ob.operator_tour_id = ot.id
         AND ob.created_at >= $2 AND ob.deleted_at IS NULL
       LEFT JOIN tour_payments tp ON tp.booking_id = ob.id
         AND tp.status = 'RELEASED'
       WHERE ot.operator_id = $1 AND ot.deleted_at IS NULL
       GROUP BY ot.id, ot.title
       ORDER BY booking_count DESC
       LIMIT 10`,
      [partnerId, startDate.toISOString()]
    );

    // 3. Conversion metrics (page_views → bookings)
    const { rows: conversionData } = await pool.query<{
      total_page_views: string;
      total_bookings: string;
      conversion_rate: string;
    }>(
      `SELECT
         (SELECT COUNT(*) FROM page_views pv
          JOIN operator_tours ot ON pv.path LIKE '%/routes/' || ot.agent_route_id || '%'
          WHERE ot.operator_id = $1 AND pv.created_at >= $2) as total_page_views,
         (SELECT COUNT(*) FROM operator_bookings ob
          JOIN operator_tours ot ON ot.id = ob.operator_tour_id
          WHERE ot.operator_id = $1 AND ob.created_at >= $2 AND ob.deleted_at IS NULL) as total_bookings,
         CASE
           WHEN (SELECT COUNT(*) FROM page_views pv
                 JOIN operator_tours ot ON pv.path LIKE '%/routes/' || ot.agent_route_id || '%'
                 WHERE ot.operator_id = $1 AND pv.created_at >= $2) > 0
           THEN ROUND(
             (SELECT COUNT(*) FROM operator_bookings ob
              JOIN operator_tours ot ON ot.id = ob.operator_tour_id
              WHERE ot.operator_id = $1 AND ob.created_at >= $2 AND ob.deleted_at IS NULL)::numeric /
             (SELECT COUNT(*) FROM page_views pv
              JOIN operator_tours ot ON pv.path LIKE '%/routes/' || ot.agent_route_id || '%'
              WHERE ot.operator_id = $1 AND pv.created_at >= $2)::numeric * 100, 2
           )
           ELSE 0
         END as conversion_rate`,
      [partnerId, startDate.toISOString()]
    );

    // 4. Booking status breakdown
    const { rows: statusBreakdown } = await pool.query<{
      status: string;
      count: string;
    }>(
      `SELECT ob.booking_status as status, COUNT(*) as count
       FROM operator_bookings ob
       JOIN operator_tours ot ON ot.id = ob.operator_tour_id
       WHERE ot.operator_id = $1 AND ob.created_at >= $2 AND ob.deleted_at IS NULL
       GROUP BY ob.booking_status`,
      [partnerId, startDate.toISOString()]
    );

    // 5. Summary metrics
    const { rows: summary } = await pool.query<{
      total_revenue: string;
      total_bookings: string;
      avg_booking_value: string;
      completed_bookings: string;
    }>(
      `SELECT
         COALESCE(SUM(tp.amount), 0) as total_revenue,
         COUNT(DISTINCT ob.id) as total_bookings,
         COALESCE(AVG(ob.final_price), 0) as avg_booking_value,
         (SELECT COUNT(*) FROM operator_bookings ob2
          JOIN operator_tours ot2 ON ot2.id = ob2.operator_tour_id
          WHERE ot2.operator_id = $1 AND ob2.booking_status = 'completed'
          AND ob2.created_at >= $2 AND ob2.deleted_at IS NULL) as completed_bookings
       FROM operator_bookings ob
       JOIN operator_tours ot ON ot.id = ob.operator_tour_id
       LEFT JOIN tour_payments tp ON tp.booking_id = ob.id AND tp.status = 'RELEASED'
       WHERE ot.operator_id = $1 AND ob.created_at >= $2 AND ob.deleted_at IS NULL`,
      [partnerId, startDate.toISOString()]
    );

    return NextResponse.json({
      success: true,
      data: {
        period: {
          days: periodDays,
          start: startDate.toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0],
        },
        summary: summary[0] ? {
          totalRevenue: Number(summary[0].total_revenue),
          totalBookings: Number(summary[0].total_bookings),
          avgBookingValue: Number(summary[0].avg_booking_value),
          completedBookings: Number(summary[0].completed_bookings),
        } : {
          totalRevenue: 0,
          totalBookings: 0,
          avgBookingValue: 0,
          completedBookings: 0,
        },
        revenue: revenueData.map(r => ({
          month: r.month,
          revenue: Number(r.total_revenue),
          bookings: Number(r.booking_count),
        })),
        topTours: topTours.map(t => ({
          id: t.tour_id,
          title: t.tour_title,
          bookings: Number(t.booking_count),
          revenue: Number(t.total_revenue),
          avgPrice: Number(t.avg_price),
        })),
        conversion: conversionData[0] ? {
          pageViews: Number(conversionData[0].total_page_views),
          bookings: Number(conversionData[0].total_bookings),
          rate: Number(conversionData[0].conversion_rate),
        } : {
          pageViews: 0,
          bookings: 0,
          rate: 0,
        },
        statusBreakdown: statusBreakdown.reduce((acc, row) => {
          acc[row.status] = Number(row.count);
          return acc;
        }, {} as Record<string, number>),
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
