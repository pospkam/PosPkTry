import { NextRequest, NextResponse } from 'next/server';
import { query } from '@core-infrastructure/lib/database';
import { ApiResponse } from '@/types';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/stay-provider/dashboard - Dashboard для поставщика размещений
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const providerId = userOrResponse.userId;

    // Метрики
    const metricsQuery = `
      WITH accommodation_stats AS (
        SELECT
          COUNT(*) as total_accommodations,
          COUNT(CASE WHEN is_active THEN 1 END) as active_accommodations,
          SUM(rooms_count) as total_rooms
        FROM accommodations
        WHERE owner_id = $1
      ),
      booking_stats AS (
        SELECT
          COUNT(*) as total_bookings,
          COUNT(CASE WHEN ab.status = 'confirmed' THEN 1 END) as confirmed_bookings,
          SUM(ab.total_price) as total_revenue,
          SUM(CASE WHEN ab.created_at >= NOW() - INTERVAL '30 days' THEN ab.total_price ELSE 0 END) as monthly_revenue
        FROM accommodation_bookings ab
        JOIN accommodations a ON ab.accommodation_id = a.id
        WHERE a.owner_id = $1
      )
      SELECT
        accommodation_stats.*,
        booking_stats.*
      FROM accommodation_stats, booking_stats
    `;

    const metricsResult = await query(metricsQuery, [providerId]);
    const metrics = metricsResult.rows[0] || {};

    // Последние бронирования
    const bookingsQuery = `
      SELECT
        ab.id,
        ab.check_in_date,
        ab.check_out_date,
        ab.total_price,
        ab.status,
        ab.guests_count,
        a.name as accommodation_name,
        ab.created_at
      FROM accommodation_bookings ab
      JOIN accommodations a ON ab.accommodation_id = a.id
      WHERE a.owner_id = $1
      ORDER BY ab.created_at DESC
      LIMIT 10
    `;

    const bookingsResult = await query(bookingsQuery, [providerId]);

    // График загрузки
    const occupancyQuery = `
      SELECT
        a.name as accommodation_name,
        COUNT(ab.id) as bookings_count,
        AVG(EXTRACT(DAY FROM (ab.check_out_date - ab.check_in_date))) as avg_stay_duration
      FROM accommodations a
      LEFT JOIN accommodation_bookings ab ON a.id = ab.accommodation_id
        AND ab.status IN ('confirmed', 'completed')
        AND ab.created_at >= NOW() - INTERVAL '90 days'
      WHERE a.owner_id = $1
      GROUP BY a.id, a.name
      ORDER BY bookings_count DESC
    `;

    const occupancyResult = await query(occupancyQuery, [providerId]);

    return NextResponse.json({
      success: true,
      data: {
        metrics: {
          totalAccommodations: parseInt(metrics.total_accommodations) || 0,
          activeAccommodations: parseInt(metrics.active_accommodations) || 0,
          totalRooms: parseInt(metrics.total_rooms) || 0,
          totalBookings: parseInt(metrics.total_bookings) || 0,
          confirmedBookings: parseInt(metrics.confirmed_bookings) || 0,
          totalRevenue: parseFloat(metrics.total_revenue) || 0,
          monthlyRevenue: parseFloat(metrics.monthly_revenue) || 0
        },
        recentBookings: bookingsResult.rows,
        occupancy: occupancyResult.rows
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error fetching stay provider dashboard:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка загрузки dashboard' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}