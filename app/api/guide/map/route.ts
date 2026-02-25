import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { getGuidePartnerId, getGuideExpertiseZones } from '@/lib/auth/guide-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/guide/map
 * Get guide's location data for map display
 */
// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
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

    // Get guide's base location
    const guideLocationResult = await query(
      `SELECT 
        p.name,
        ST_X(p.location::geometry) as longitude,
        ST_Y(p.location::geometry) as latitude,
        p.specializations
      FROM partners p
      WHERE p.id = $1`,
      [guideId]
    );

    const guideLocation = guideLocationResult.rows[0];
    const baseLocation = guideLocation?.latitude && guideLocation?.longitude ? {
      lat: parseFloat(guideLocation.latitude),
      lng: parseFloat(guideLocation.longitude),
      name: guideLocation.name,
      specializations: guideLocation.specializations
    } : null;

    // Get expertise zones (tours)
    const expertiseZones = await getGuideExpertiseZones(guideId);

    // Get upcoming schedule locations
    const upcomingLocationsResult = await query(
      `SELECT 
        gs.id,
        gs.title,
        gs.start_time,
        gs.location_name,
        ST_X(gs.location::geometry) as longitude,
        ST_Y(gs.location::geometry) as latitude,
        t.title as tour_title
      FROM guide_schedule gs
      LEFT JOIN tours t ON gs.tour_id = t.id
      WHERE gs.guide_id = $1 
        AND gs.start_time >= NOW()
        AND gs.start_time < NOW() + INTERVAL '7 days'
        AND gs.status != 'cancelled'
        AND gs.location IS NOT NULL
      ORDER BY gs.start_time ASC
      LIMIT 20`,
      [guideId]
    );

    const upcomingLocations = upcomingLocationsResult.rows.map(row => ({
      id: row.id,
      title: row.title,
      tourTitle: row.tour_title,
      startTime: row.start_time,
      locationName: row.location_name,
      location: {
        lat: parseFloat(row.latitude),
        lng: parseFloat(row.longitude)
      }
    }));

    // Get popular locations (most frequent tour locations)
    const popularLocationsResult = await query(
      `SELECT 
        t.location_name,
        ST_X(t.location::geometry) as longitude,
        ST_Y(t.location::geometry) as latitude,
        COUNT(b.id) as bookings_count,
        t.title as tour_title
      FROM tours t
      LEFT JOIN bookings b ON t.id = b.tour_id
      WHERE t.guide_id = $1 
        AND t.location IS NOT NULL
      GROUP BY t.id, t.location_name, t.location, t.title
      ORDER BY bookings_count DESC
      LIMIT 10`,
      [guideId]
    );

    const popularLocations = popularLocationsResult.rows.map(row => ({
      locationName: row.location_name,
      location: {
        lat: parseFloat(row.latitude),
        lng: parseFloat(row.longitude)
      },
      tourTitle: row.tour_title,
      bookingsCount: parseInt(row.bookings_count || 0)
    }));

    // Get recent activity trail (last 30 days completed tours)
    const activityTrailResult = await query(
      `SELECT 
        gs.title,
        gs.start_time,
        gs.location_name,
        ST_X(gs.location::geometry) as longitude,
        ST_Y(gs.location::geometry) as latitude
      FROM guide_schedule gs
      WHERE gs.guide_id = $1 
        AND gs.status = 'completed'
        AND gs.start_time >= CURRENT_DATE - INTERVAL '30 days'
        AND gs.location IS NOT NULL
      ORDER BY gs.start_time DESC
      LIMIT 50`,
      [guideId]
    );

    const activityTrail = activityTrailResult.rows.map(row => ({
      title: row.title,
      startTime: row.start_time,
      locationName: row.location_name,
      location: {
        lat: parseFloat(row.latitude),
        lng: parseFloat(row.longitude)
      }
    }));

    return NextResponse.json({
      success: true,
      data: {
        baseLocation,
        expertiseZones,
        upcomingLocations,
        popularLocations,
        activityTrail
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get guide map data error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении данных карты'
    } as ApiResponse<null>, { status: 500 });
  }
}
