/**
 * GET /api/hub/operator/earnings
 * Operator earnings dashboard — affiliate commission + direct bookings
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const userOrResponse = await requireAuth(request);

  if (userOrResponse instanceof NextResponse) {
    return userOrResponse;
  }

  const user = userOrResponse;

  try {
    // Get operator ID from user
    const opResult = await pool.query(
      `SELECT id FROM partners WHERE user_id = $1 AND category = 'operator'`,
      [user.id]
    );

    if (!opResult.rows.length) {
      return NextResponse.json({ error: 'Not an operator' }, { status: 403 });
    }

    const operatorId = opResult.rows[0].id;

    // Bookings (direct revenue)
    const bookingsResult = await pool.query(
      `SELECT
         COUNT(*) as total_bookings,
         COALESCE(SUM(CAST(final_price AS NUMERIC)), 0) as total_revenue,
         COUNT(*) FILTER (WHERE booking_status = 'confirmed') as confirmed_count,
         COUNT(*) FILTER (WHERE booking_status = 'pending') as pending_count,
         DATE(created_at) as date
       FROM bookings
       WHERE tour_id IN (SELECT id FROM tours WHERE operator_id = $1)
       AND created_at > NOW() - INTERVAL '30 days'
       GROUP BY DATE(created_at)
       ORDER BY date DESC`,
      [operatorId]
    );

    // Affiliate clicks from operator page
    const affiliateResult = await pool.query(
      `SELECT
         partner,
         COUNT(*) as clicks,
         COUNT(DISTINCT ip_addr) as unique_visitors
       FROM affiliate_clicks
       WHERE source = $1
       AND clicked_at > NOW() - INTERVAL '30 days'
       GROUP BY partner
       ORDER BY clicks DESC`,
      [`operator_page_${operatorId}`]
    );

    const totalBookings = bookingsResult.rows.reduce((sum, r) => sum + parseInt(r.total_bookings), 0);
    const totalRevenue = bookingsResult.rows[0]?.total_revenue || 0;
    const totalAffiliateClicks = affiliateResult.rows.reduce((sum, r) => sum + parseInt(r.clicks), 0);

    return NextResponse.json({
      success: true,
      summary: {
        totalBookings,
        totalRevenue: parseFloat(totalRevenue),
        confirmedBookings: bookingsResult.rows[0]?.confirmed_count || 0,
        pendingBookings: bookingsResult.rows[0]?.pending_count || 0,
        affiliateClicks: totalAffiliateClicks,
        estimatedAffiliateCommission: totalAffiliateClicks * 50, // rough estimate
      },
      bookingsByDay: bookingsResult.rows,
      affiliatePartners: affiliateResult.rows,
    });
  } catch (err) {
    console.error('Earnings error:', err);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
