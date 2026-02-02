import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { getGuidePartnerId, getGuideStats } from '@/lib/auth/guide-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/guide/stats
 * Get comprehensive guide statistics and analytics
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'guide') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    const guideId = await getGuidePartnerId(userId);
    
    if (!guideId) {
      return NextResponse.json({
        success: false,
        error: 'Профиль гида не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    // Get basic stats
    const stats = await getGuideStats(userId);

    // Get daily schedule load (next 30 days)
    const scheduleLoadResult = await query(
      `SELECT 
        DATE(start_time) as date,
        COUNT(*) as events_count,
        SUM(max_participants) as total_capacity,
        SUM(current_participants) as total_participants
      FROM guide_schedule
      WHERE guide_id = $1 
        AND start_time >= CURRENT_DATE
        AND start_time < CURRENT_DATE + INTERVAL '30 days'
        AND status != 'cancelled'
      GROUP BY DATE(start_time)
      ORDER BY date ASC`,
      [guideId]
    );

    const scheduleLoad = scheduleLoadResult.rows.map(row => ({
      date: row.date,
      eventsCount: parseInt(row.events_count),
      totalCapacity: parseInt(row.total_capacity),
      totalParticipants: parseInt(row.total_participants),
      loadPercentage: Math.round((parseInt(row.total_participants) / parseInt(row.total_capacity)) * 100)
    }));

    // Popular times analysis
    const popularTimesResult = await query(
      `SELECT 
        EXTRACT(DOW FROM start_time) as day_of_week,
        EXTRACT(HOUR FROM start_time) as hour,
        COUNT(*) as count
      FROM guide_schedule
      WHERE guide_id = $1 
        AND status = 'completed'
        AND start_time >= CURRENT_DATE - INTERVAL '90 days'
      GROUP BY EXTRACT(DOW FROM start_time), EXTRACT(HOUR FROM start_time)
      ORDER BY count DESC
      LIMIT 10`,
      [guideId]
    );

    const popularTimes = popularTimesResult.rows.map(row => ({
      dayOfWeek: parseInt(row.day_of_week),
      hour: parseInt(row.hour),
      count: parseInt(row.count)
    }));

    // Earnings breakdown
    const earningsBreakdownResult = await query(
      `SELECT 
        DATE_TRUNC('week', date) as week,
        COUNT(*) as bookings_count,
        SUM(amount) as total_amount,
        AVG(amount) as avg_amount,
        SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid_amount,
        SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending_amount
      FROM guide_earnings
      WHERE guide_id = $1 
        AND date >= CURRENT_DATE - INTERVAL '12 weeks'
      GROUP BY DATE_TRUNC('week', date)
      ORDER BY week DESC`,
      [guideId]
    );

    const earningsBreakdown = earningsBreakdownResult.rows.map(row => ({
      week: row.week,
      bookingsCount: parseInt(row.bookings_count),
      totalAmount: parseFloat(row.total_amount || 0),
      avgAmount: parseFloat(row.avg_amount || 0),
      paidAmount: parseFloat(row.paid_amount || 0),
      pendingAmount: parseFloat(row.pending_amount || 0)
    }));

    // Client repeat rate
    const repeatClientsResult = await query(
      `SELECT 
        COUNT(DISTINCT tourist_id) as total_clients,
        COUNT(DISTINCT CASE WHEN booking_count > 1 THEN tourist_id END) as repeat_clients
      FROM (
        SELECT 
          gr.tourist_id,
          COUNT(*) as booking_count
        FROM guide_reviews gr
        WHERE gr.guide_id = $1
          AND gr.tourist_id IS NOT NULL
        GROUP BY gr.tourist_id
      ) as client_bookings`,
      [guideId]
    );

    const repeatStats = repeatClientsResult.rows[0];
    const totalClients = parseInt(repeatStats.total_clients || 0);
    const repeatClients = parseInt(repeatStats.repeat_clients || 0);
    const repeatRate = totalClients > 0 ? Math.round((repeatClients / totalClients) * 100) : 0;

    // Recent certifications
    const certificationsResult = await query(
      `SELECT 
        id,
        name,
        issuing_authority,
        issue_date,
        expiry_date,
        is_verified
      FROM guide_certifications
      WHERE guide_id = $1
      ORDER BY issue_date DESC NULLS LAST
      LIMIT 5`,
      [guideId]
    );

    const certifications = certificationsResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      issuingAuthority: row.issuing_authority,
      issueDate: row.issue_date,
      expiryDate: row.expiry_date,
      isVerified: row.is_verified,
      isExpiringSoon: row.expiry_date && new Date(row.expiry_date) < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
    }));

    return NextResponse.json({
      success: true,
      data: {
        ...stats,
        scheduleLoad,
        popularTimes,
        earningsBreakdown,
        clientRetention: {
          totalClients,
          repeatClients,
          repeatRate
        },
        certifications
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get guide stats error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении статистики'
    } as ApiResponse<null>, { status: 500 });
  }
}
