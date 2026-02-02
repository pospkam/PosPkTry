import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAuth } from '@/lib/auth/middleware';
import { getTouristProfile, getTouristTravelStats } from '@/lib/auth/tourist-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tourist/stats - Get comprehensive tourist statistics
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const profile = await getTouristProfile(userOrResponse.id);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Профиль не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const travelStats = await getTouristTravelStats(userOrResponse.id);

    const tripsTimeline = await query(
      `SELECT 
        DATE_TRUNC('month', start_date) as month,
        COUNT(*) as trips_count,
        SUM(actual_spent) as total_spent
       FROM tourist_trips
       WHERE tourist_id = $1 AND status = 'completed'
       GROUP BY DATE_TRUNC('month', start_date)
       ORDER BY month DESC
       LIMIT 12`,
      [profile.id]
    );

    const categoryStats = await query(
      `SELECT 
        trip_type,
        COUNT(*) as count,
        AVG(actual_spent) as avg_spent
       FROM tourist_trips
       WHERE tourist_id = $1 AND status = 'completed'
       GROUP BY trip_type
       ORDER BY count DESC`,
      [profile.id]
    );

    const recentReviews = await query(
      `SELECT * FROM tourist_reviews WHERE tourist_id = $1 ORDER BY created_at DESC LIMIT 5`,
      [profile.id]
    );

    const upcomingTrips = await query(
      `SELECT * FROM tourist_trips WHERE tourist_id = $1 AND status IN ('planning', 'upcoming') ORDER BY start_date ASC LIMIT 5`,
      [profile.id]
    );

    return NextResponse.json({
      success: true,
      data: {
        overview: travelStats,
        profile_summary: {
          loyalty_tier: profile.loyalty_tier,
          loyalty_points: profile.loyalty_points,
          total_trips: profile.total_trips,
          total_spent: profile.total_spent,
          average_rating: profile.average_rating,
          member_since: profile.created_at
        },
        trips_timeline: tripsTimeline.rows,
        category_stats: categoryStats.rows,
        recent_reviews: recentReviews.rows,
        upcoming_trips: upcomingTrips.rows
      }
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error fetching tourist stats:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении статистики' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
