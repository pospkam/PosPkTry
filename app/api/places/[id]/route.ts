/**
 * GET /api/places/[id]
 * Full place card data: place + safety + realtime + nearby (single main query).
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
    // Main query: place + safety + realtime in one round-trip
    const result = await query(
      `SELECT
         p.id AS place_pk,
         p.ark_id,
         p.name,
         p.description,
         p.essence,
         p.category,
         p.location_type,
         p.lat,
         p.lng,
         p.zone,
         p.district,
         p.photo_url,
         p.images,
         p.best_season,
         p.seasonal_notes,
         p.access_info,
         p.source_url,
         p.source_name,
         p.updated_at,
         p.kuzmich_review,
         p.eco_zone,
         p.eco_permit_required,
         p.eco_rules,
         p.eco_permit_url,
         p.indigenous_info,
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
         sp.optimal_group_size,
         sp.open_from_date,
         sp.open_to_date,
         sp.required_gear,
         sp.connectivity,
         sp.registration_required,
         sp.medical_info,
         rs.is_open,
         rs.current_crowds,
         rs.current_weather,
         rs.active_alerts,
         rs.alert_severity,
         rs.alert_message,
         rs.tourists_today,
         rs.tourists_hour,
         rs.updated_at AS realtime_updated_at,
         (SELECT count(*)::int FROM ai_route_images ai WHERE ai.route_id = p.ark_id) AS photo_count
       FROM places p
       LEFT JOIN location_safety_profile sp ON sp.agent_route_id = p.ark_id
       LEFT JOIN location_real_time_status rs ON rs.agent_route_id = p.ark_id
       WHERE (p.ark_id::text = $1 OR p.id = $1)
         AND p.is_visible = true`,
      [id]
    );

    if (!result.rows[0]) {
      return NextResponse.json({ success: false, error: 'Место не найдено' }, { status: 404 });
    }

    const r = result.rows[0];

    // Nearby: haversine, 50km radius, max 6
    const nearbyResult = await query(
      `SELECT
         p.ark_id AS id,
         p.name,
         p.location_type,
         p.lat,
         p.lng,
         p.photo_url,
         (SELECT CASE WHEN EXISTS(SELECT 1 FROM ai_route_images ai2 WHERE ai2.route_id = p.ark_id) THEN '/api/images/route/' || p.ark_id ELSE NULL END) AS thumb_url,
         round(
           6371 * acos(
             LEAST(1.0, cos(radians($1::float)) * cos(radians(p.lat::float)) *
             cos(radians(p.lng::float) - radians($2::float)) +
             sin(radians($1::float)) * sin(radians(p.lat::float)))
           )
         )::int AS distance_km
       FROM places p
       WHERE p.ark_id != $3
         AND p.is_visible = true
         AND p.lat BETWEEN ($1::float - 0.5) AND ($1::float + 0.5)
         AND p.lng BETWEEN ($2::float - 0.8) AND ($2::float + 0.8)
       ORDER BY (p.lat::float - $1::float)^2 + (p.lng::float - $2::float)^2
       LIMIT 6`,
      [r.lat, r.lng, r.ark_id]
    );

    // Reviews for this place
    const reviewsResult = await query(
      `SELECT rv.id, rv.rating, rv.comment, rv.created_at,
         COALESCE(u.name, 'Турист') AS author_name
       FROM reviews rv
       LEFT JOIN users u ON u.id = rv.user_id
       WHERE rv.place_id = $1
       ORDER BY rv.created_at DESC
       LIMIT 10`,
      [r.ark_id]
    );

    // Routes through this place (via route_waypoints — may be empty for now)
    const routesResult = await query(
      `SELECT kr.id, kr.title, kr.activity_type, kr.difficulty, kr.distance_km, kr.duration_hours
       FROM route_waypoints rw
       JOIN kamchatka_routes kr ON kr.id = rw.route_id
       WHERE rw.place_id = $1
       ORDER BY rw.position
       LIMIT 10`,
      [r.place_pk]
    );

    // Tours to this place (via route_waypoints → kamchatka_routes → operator_tours)
    const toursResult = await query(
      `SELECT DISTINCT ON (ot.id)
         ot.id, ot.title, ot.base_price, ot.duration_days,
         p.name AS operator_name, p.slug AS operator_slug
       FROM route_waypoints rw
       JOIN kamchatka_routes kr ON kr.id = rw.route_id
       JOIN operator_tours ot ON ot.route_id = kr.id
       JOIN partners p ON p.id = ot.operator_id
       WHERE rw.place_id = $1
         AND ot.is_visible = true
       ORDER BY ot.id, ot.base_price ASC
       LIMIT 5`,
      [r.place_pk]
    );

    const hazardTypes = Array.isArray(r.hazard_types) ? (r.hazard_types as string[]) : [];
    const requiredGear = Array.isArray(r.required_gear) ? (r.required_gear as string[]) : [];

    return NextResponse.json({
      success: true,
      data: {
        id: r.ark_id as string,
        name: r.name as string,
        description: r.description as string | null,
        essence: r.essence as string | null,
        category: r.category as string | null,
        locationType: r.location_type as string | null,
        lat: parseFloat(r.lat as string),
        lng: parseFloat(r.lng as string),
        zone: r.zone as string | null,
        district: r.district as string | null,
        photoUrl: (() => {
          if (r.photo_url) return r.photo_url as string;
          // Use first real URL from places.images if available
          const imgs = r.images as unknown[] | null;
          if (Array.isArray(imgs) && imgs.length > 0) {
            const first = imgs[0];
            if (typeof first === 'string' && (first.startsWith('http') || first.startsWith('/'))) return first;
          }
          if (Number(r.photo_count) > 0) return `/api/images/route/${r.ark_id}`;
          return null;
        })(),
        images: (r.images as unknown[] | null) ?? [],
        photoCount: Number(r.photo_count),
        bestSeason: r.best_season as string | null,
        seasonalNotes: r.seasonal_notes as Record<string, string> | null,
        accessInfo: r.access_info as string | null,
        sourceUrl: r.source_url as string | null,
        sourceName: r.source_name as string | null,
        updatedAt: r.updated_at as string | null,
        kuzmichReview: (r.kuzmich_review as string | null) ?? null,

        eco: r.eco_zone ? {
          zone: r.eco_zone as string,
          permitRequired: Boolean(r.eco_permit_required),
          rules: (r.eco_rules as string | null) ?? null,
          permitUrl: (r.eco_permit_url as string | null) ?? null,
        } : null,

        indigenous: (() => {
          const raw = r.indigenous_info as Record<string, unknown> | null;
          if (!raw) return null;
          const peoples = Array.isArray(raw.peoples) ? (raw.peoples as string[]) : [];
          if (peoples.length === 0 && !raw.local_name && !raw.sacred) return null;
          return {
            peoples,
            localName: (raw.local_name as string | null) ?? null,
            sacred: Boolean(raw.sacred),
            traditionalUse: (raw.traditional_use as string | null) ?? null,
            respectNotes: (raw.respect_notes as string | null) ?? null,
          };
        })(),

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
          satCommunicatorRequired: r.sat_communicator_required as boolean | null,
          rulesRequired: r.rules_required as string | null,
          weatherThreshold: r.weather_threshold as Record<string, unknown> | null,
          hazardTypes,
          capacityPerDay: r.capacity_per_day != null ? Number(r.capacity_per_day) : null,
          optimalGroupSize: r.optimal_group_size != null ? Number(r.optimal_group_size) : null,
          openFromDate: r.open_from_date as string | null,
          openToDate: r.open_to_date as string | null,
          requiredGear,
          connectivity: r.connectivity as Record<string, unknown> | null,
          registrationRequired: r.registration_required as boolean ?? false,
          medicalInfo: r.medical_info as string | null,
        },

        realtime: r.is_open !== null || r.alert_severity !== null ? {
          isOpen: r.is_open as boolean | null,
          currentCrowds: r.current_crowds != null ? Number(r.current_crowds) : null,
          currentWeather: r.current_weather as Record<string, unknown> | null,
          activeAlerts: r.active_alerts as string[] | null,
          alertSeverity: r.alert_severity != null ? Number(r.alert_severity) : null,
          alertMessage: r.alert_message as string | null,
          touristsToday: r.tourists_today != null ? Number(r.tourists_today) : null,
          touristsHour: r.tourists_hour != null ? Number(r.tourists_hour) : null,
          updatedAt: r.realtime_updated_at as string | null,
        } : null,

        routes: routesResult.rows.map(rt => ({
          id: rt.id as string,
          title: rt.title as string,
          activityType: rt.activity_type as string | null,
          difficulty: rt.difficulty as string | null,
          distanceKm: rt.distance_km != null ? Number(rt.distance_km) : null,
          durationHours: rt.duration_hours != null ? Number(rt.duration_hours) : null,
        })),

        tours: toursResult.rows.map(t => ({
          id: t.id as string,
          title: t.title as string,
          basePrice: Number(t.base_price),
          durationDays: t.duration_days != null ? Number(t.duration_days) : null,
          operatorName: t.operator_name as string,
          operatorSlug: t.operator_slug as string | null,
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
          thumbUrl: (n.thumb_url ?? n.photo_url) as string | null,
        })),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ошибка базы данных';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
