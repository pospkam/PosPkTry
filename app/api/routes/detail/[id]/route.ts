/**
 * GET /api/routes/detail/[id]
 * Карточка маршрута — данные из kamchatka_routes + waypoints + nearby + tours.
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
         r.id,
         r.ark_id,
         r.title,
         r.description,
         r.category,
         r.activity_type,
         r.zone,
         r.difficulty,
         r.lat,
         r.lng,
         r.source_url,
         r.source_name,
         r.pdf_url,
         r.season,
         r.route_type,
         r.hazards,
         r.equipment,
         r.mchs_registration_required,
         r.mchs_phone,
         r.park_name,
         r.park_approval_url,
         r.distance_km,
         r.elevation_gain_m,
         r.duration_hours,
         r.flora_fauna,
         r.accessibility,
         r.geometry,
         r.created_at
       FROM kamchatka_routes r
       WHERE r.id = $1::uuid OR r.ark_id = $1::uuid`,
      [id]
    );

    if (!result.rows[0]) {
      return NextResponse.json({ success: false, error: 'Маршрут не найден' }, { status: 404 });
    }

    const r = result.rows[0];

    const waypointsResult = await query(
      `SELECT rw.position, rw.is_start, rw.is_end, rw.notes,
         p.ark_id AS place_id, p.name AS place_name, p.location_type,
         p.lat AS place_lat, p.lng AS place_lng,
         sp.altitude_m, sp.hazard_types
       FROM route_waypoints rw
       JOIN places p ON p.id = rw.place_id
       LEFT JOIN location_safety_profile sp ON sp.agent_route_id = p.ark_id
       WHERE rw.route_id = $1
       ORDER BY rw.position`,
      [r.id]
    );

    const toursResult = await query(
      `SELECT ot.id, ot.title, ot.base_price, ot.activity_type,
         ot.duration_hours, ot.duration_type, ot.multi_day_count,
         p.name AS operator_name, p.slug AS operator_slug
       FROM operator_tours ot
       LEFT JOIN partners p ON p.id = ot.operator_id
       WHERE ot.route_id = $1 AND ot.is_active = true
       ORDER BY ot.base_price
       LIMIT 10`,
      [r.id]
    );

    const nearbyResult = await query(
      `SELECT kr.id, kr.title, kr.activity_type, kr.zone, kr.difficulty
       FROM kamchatka_routes kr
       WHERE kr.id != $1
         AND kr.zone = $2
         AND kr.ark_id IS NOT NULL
       ORDER BY kr.title
       LIMIT 6`,
      [r.id, r.zone]
    );

    const reviewsResult = await query(
      `SELECT rv.id, rv.rating, rv.comment, rv.created_at,
         COALESCE(u.name, 'Турист') AS author_name
       FROM reviews rv
       LEFT JOIN users u ON u.id = rv.user_id
       WHERE rv.tour_id::text = $1
       ORDER BY rv.created_at DESC
       LIMIT 5`,
      [r.ark_id ?? r.id]
    );

    return NextResponse.json({
      success: true,
      data: {
        id: r.id as string,
        title: r.title as string,
        description: r.description as string | null,
        category: r.category as string | null,
        activityType: r.activity_type as string | null,
        zone: r.zone as string | null,
        difficulty: r.difficulty as string | null,
        lat: r.lat != null ? parseFloat(r.lat as string) : null,
        lng: r.lng != null ? parseFloat(r.lng as string) : null,
        sourceUrl: r.source_url as string | null,
        pdfUrl: r.pdf_url as string | null,
        season: r.season as string | null,
        routeType: r.route_type as string | null,
        hazards: (r.hazards as string[]) ?? [],
        equipment: (r.equipment as string[]) ?? [],
        distanceKm: r.distance_km != null ? parseFloat(r.distance_km as string) : null,
        elevationGainM: r.elevation_gain_m as number | null,
        durationHours: r.duration_hours != null ? parseFloat(r.duration_hours as string) : null,
        floraFauna: r.flora_fauna as string | null,
        accessibility: r.accessibility as string | null,
        geometry: r.geometry as { type: string; coordinates: [number, number][] } | null,

        mchs: {
          required: r.mchs_registration_required as boolean,
          phone: r.mchs_phone as string | null,
          formUrl: 'https://forms.mchs.gov.ru/registration_tourist_groups/form',
          parkName: r.park_name as string | null,
          parkApprovalUrl: r.park_approval_url as string | null,
        },

        waypoints: waypointsResult.rows.map(w => ({
          position: Number(w.position),
          isStart: w.is_start as boolean,
          isEnd: w.is_end as boolean,
          notes: w.notes as string | null,
          placeId: w.place_id as string,
          placeName: w.place_name as string,
          locationType: w.location_type as string | null,
          lat: w.place_lat != null ? parseFloat(w.place_lat as string) : null,
          lng: w.place_lng != null ? parseFloat(w.place_lng as string) : null,
          altitudeM: w.altitude_m != null ? Number(w.altitude_m) : null,
          hazardTypes: (w.hazard_types as string[]) ?? [],
        })),

        tours: toursResult.rows.map(t => ({
          id: Number(t.id),
          title: t.title as string,
          basePrice: t.base_price != null ? parseFloat(t.base_price as string) : null,
          operatorName: t.operator_name as string | null,
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
          title: n.title as string,
          activityType: n.activity_type as string | null,
          difficulty: n.difficulty as string | null,
        })),
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ошибка базы данных';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
