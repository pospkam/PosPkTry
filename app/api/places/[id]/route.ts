/**
 * GET /api/places/[id]
 * Карточка точки/локации — данные из places + safety + realtime + фото + nearby.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || id.length < 10) {
    return NextResponse.json({ success: false, error: 'Некорректный ID' }, { status: 400 });
  }

  try {
    const result = await query(
      `SELECT
         p.id,
         p.ark_id,
         p.name,
         p.description,
         p.category,
         p.location_type,
         p.activity_type,
         p.lat,
         p.lng,
         p.zone,
         p.difficulty,
         p.source_url,
         p.source_name,
         p.created_at,
         sp.difficulty_level,
         sp.altitude_m,
         sp.altitude_diff_m,
         sp.distance_km,
         sp.terrain_type,
         sp.road_type,
         sp.road_accessibility,
         sp.nearest_medical_km,
         sp.emergency_access,
         sp.phone_ranger_mches,
         sp.sat_communicator_required,
         sp.rules_required,
         sp.weather_threshold,
         sp.hazard_types,
         sp.capacity_per_day,
         sp.open_from_date,
         sp.open_to_date,
         rs.is_open,
         rs.current_crowds,
         rs.current_weather,
         rs.active_alerts,
         rs.alert_severity,
         rs.alert_message,
         rs.tourists_today,
         rs.tourists_hour,
         (SELECT count(*) FROM ai_route_images ai WHERE ai.route_id = p.ark_id) AS photo_count
       FROM places p
       LEFT JOIN location_safety_profile sp ON sp.agent_route_id = p.ark_id
       LEFT JOIN location_real_time_status rs ON rs.agent_route_id = p.ark_id
       WHERE p.ark_id::text = $1 OR p.id = $1`,
      [id]
    );

    if (!result.rows[0]) {
      return NextResponse.json({ success: false, error: 'Место не найдено' }, { status: 404 });
    }

    const r = result.rows[0];

    const nearbyResult = await query(
      `SELECT p.ark_id AS id, p.name, p.location_type, p.lat, p.lng,
         round(
           6371 * acos(
             cos(radians($1)) * cos(radians(p.lat)) *
             cos(radians(p.lng) - radians($2)) +
             sin(radians($1)) * sin(radians(p.lat))
           )
         )::int AS distance_km
       FROM places p
       WHERE p.ark_id != $3
         AND p.lat BETWEEN ($1 - 0.15) AND ($1 + 0.15)
         AND p.lng BETWEEN ($2 - 0.3) AND ($2 + 0.3)
       ORDER BY
         (p.lat - $1)*(p.lat - $1) + (p.lng - $2)*(p.lng - $2)
       LIMIT 6`,
      [r.lat, r.lng, r.ark_id]
    );

    const routesResult = await query(
      `SELECT kr.id, kr.title, kr.activity_type, kr.difficulty
       FROM route_waypoints rw
       JOIN kamchatka_routes kr ON kr.id = rw.route_id
       WHERE rw.place_id = $1
       ORDER BY rw.position
       LIMIT 10`,
      [r.id]
    );

    const reviewsResult = await query(
      `SELECT rv.id, rv.rating, rv.comment, rv.created_at,
         COALESCE(u.name, 'Турист') AS author_name
       FROM reviews rv
       LEFT JOIN users u ON u.id = rv.user_id
       WHERE rv.tour_id::text = $1
       ORDER BY rv.created_at DESC
       LIMIT 5`,
      [r.ark_id]
    );

    const hazardTypes = Array.isArray(r.hazard_types) ? r.hazard_types as string[] : [];

    return NextResponse.json({
      success: true,
      data: {
        id: r.ark_id as string,
        name: r.name as string,
        description: r.description as string,
        category: r.category as string | null,
        locationType: r.location_type as string | null,
        activityType: r.activity_type as string | null,
        lat: parseFloat(r.lat as string),
        lng: parseFloat(r.lng as string),
        zone: r.zone as string | null,
        photoCount: Number(r.photo_count),
        sourceUrl: r.source_url as string | null,
        sourceName: r.source_name as string | null,

        safety: {
          difficultyLevel: r.difficulty_level != null ? Number(r.difficulty_level) : null,
          altitudeM: r.altitude_m != null ? Number(r.altitude_m) : null,
          altitudeDiffM: r.altitude_diff_m != null ? Number(r.altitude_diff_m) : null,
          distanceKm: r.distance_km != null ? Number(r.distance_km) : null,
          terrainType: r.terrain_type as string | null,
          roadType: r.road_type as string | null,
          roadAccessibility: r.road_accessibility != null ? Number(r.road_accessibility) : null,
          nearestMedicalKm: r.nearest_medical_km != null ? Number(r.nearest_medical_km) : null,
          emergencyAccess: r.emergency_access as string | null,
          phoneRangerMches: r.phone_ranger_mches as string | null,
          satCommunicatorRequired: r.sat_communicator_required as boolean,
          rulesRequired: r.rules_required as string | null,
          weatherThreshold: r.weather_threshold as Record<string, unknown> | null,
          hazardTypes: hazardTypes,
          capacityPerDay: r.capacity_per_day != null ? Number(r.capacity_per_day) : null,
          openFromDate: r.open_from_date as string | null,
          openToDate: r.open_to_date as string | null,
        },

        realtime: {
          isOpen: r.is_open as boolean | null,
          currentCrowds: r.current_crowds != null ? Number(r.current_crowds) : null,
          currentWeather: r.current_weather as string | null,
          activeAlerts: r.active_alerts as string[] | null,
          alertSeverity: r.alert_severity != null ? Number(r.alert_severity) : null,
          alertMessage: r.alert_message as string | null,
          touristsToday: r.tourists_today != null ? Number(r.tourists_today) : null,
          touristsHour: r.tourists_hour != null ? Number(r.tourists_hour) : null,
        },

        routes: routesResult.rows.map(rt => ({
          id: rt.id as string,
          title: rt.title as string,
          activityType: rt.activity_type as string | null,
          difficulty: rt.difficulty as string | null,
        })),

        reviews: reviewsResult.rows.map(rv => ({
          id: rv.id as string,
          rating: Number(rv.rating),
          comment: rv.comment as string | null,
          authorName: rv.author_name as string,
          createdAt: rv.created_at as string,
        })),

        nearby: nearbyResult.rows.map(n => ({
          id: n.id as string,
          name: n.name as string,
          locationType: n.location_type as string | null,
          lat: parseFloat(n.lat as string),
          lng: parseFloat(n.lng as string),
          distanceKm: Number(n.distance_km),
        })),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ошибка базы данных';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
