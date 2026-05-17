/**
 * GET /api/routes/[id]
 * Один маршрут по UUID + предложения операторов из marketplace.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ success: false, error: 'Некорректный ID' }, { status: 400 });
  }

  try {
    const result = await query(
      `SELECT
         ark.id, ark.route_dedupe_key, ark.route_id, ark.category, ark.location_type, ark.activity_type,
         ark.title, ark.description, ark.lat, ark.lng, ark.source_url, ark.source_name, ark.payload, ark.created_at,
         ark.kuzmich_review,
         (ari.route_id IS NOT NULL) AS has_ai_image,
         kr.mchs_registration_required,
         kr.mchs_phone,
         kr.park_name,
         kr.park_approval_url,
         kr.hazards,
         kr.equipment     AS kr_equipment,
         kr.distance_km,
         kr.elevation_gain_m,
         kr.duration_hours AS kr_duration_hours
       FROM agent_route_knowledge ark
       LEFT JOIN ai_route_images ari ON ari.route_id = ark.id
       LEFT JOIN kamchatka_routes kr ON kr.id = ark.id
       WHERE ark.id = $1 AND ark.is_visible = TRUE`,
      [id]
    );

    if (!result.rows[0]) {
      return NextResponse.json({ success: false, error: 'Маршрут не найден' }, { status: 404 });
    }

    // Increment view count (fire-and-forget)
    pool.query('UPDATE kamchatka_routes SET view_count = view_count + 1 WHERE id = $1', [id]).catch(() => {});

    const r = result.rows[0];
    const payload = (r.payload as Record<string, unknown>) ?? {};

    // Загружаем предложения операторов из operator_tours (через v_route_marketplace)
    let offers: unknown[] = [];
    {
      const offersResult = await query(
        `SELECT
           tour_id,
           tour_name,
           tour_short_desc,
           tour_price_base,
           price_old,
           price_unit,
           effective_price,
           tour_duration_hours,
           duration_type,
           multi_day_count,
           tour_difficulty,
           max_group_size,
           min_group_size,
           tour_rating,
           tour_review_count,
           included,
           season_start,
           season_end,
           operator_id,
           operator_name,
           operator_slug,
           operator_rating,
           operator_review_count,
           operator_verified,
           tour_image,
           operator_hero_image,
           commission_rate,
           next_departure_date,
           next_departure_slots,
           marketplace_score
         FROM v_route_marketplace
         WHERE route_id = $1
         ORDER BY marketplace_score DESC`,
        [id]
      );

      offers = offersResult.rows.map(o => ({
        tourId:           Number(o.tour_id),
        tourName:         o.tour_name as string,
        shortDesc:        (o.tour_short_desc as string | null) ?? null,
        priceBase:        o.tour_price_base != null ? Number(o.tour_price_base) : null,
        priceOld:         o.price_old != null ? Number(o.price_old) : null,
        priceUnit:        (o.price_unit as string | null) ?? null,
        effectivePrice:   o.effective_price != null ? Number(o.effective_price) : null,
        durationHours:    o.tour_duration_hours != null ? Number(o.tour_duration_hours) : null,
        durationType:     (o.duration_type as string | null) ?? null,
        multiDayCount:    o.multi_day_count != null ? Number(o.multi_day_count) : null,
        difficulty:       (o.tour_difficulty as string | null) ?? null,
        maxGroupSize:     o.max_group_size != null ? Number(o.max_group_size) : null,
        minGroupSize:     o.min_group_size != null ? Number(o.min_group_size) : null,
        rating:           o.tour_rating != null ? Number(o.tour_rating) : null,
        reviewCount:      o.tour_review_count != null ? Number(o.tour_review_count) : null,
        included:         (o.included as unknown[]) ?? [],
        seasonStart:      (o.season_start as string | null) ?? null,
        seasonEnd:        (o.season_end as string | null) ?? null,
        operator: {
          id:           o.operator_id as string,
          name:         o.operator_name as string,
          slug:         (o.operator_slug as string | null) ?? null,
          rating:       o.operator_rating != null ? Number(o.operator_rating) : null,
          reviewCount:  o.operator_review_count != null ? Number(o.operator_review_count) : null,
          verified:     o.operator_verified as boolean,
        },
        tourImage:        (o.tour_image as string | null) ?? null,
        operatorHeroImage: (o.operator_hero_image as string | null) ?? null,
        nextDeparture:    (o.next_departure_date as string | null) ?? null,
        nextSlots:        o.next_departure_slots != null ? Number(o.next_departure_slots) : null,
      }));
    }

    return NextResponse.json({
      success: true,
      data: {
        id:           r.id as string,
        slug:         r.route_dedupe_key as string,
        routeId:      (r.route_id as string | null) ?? null,
        category:     r.category as string,
        locationType: (r.location_type as string | null) ?? null,
        activityType: (r.activity_type as string | null) ?? null,
        title:        r.title as string,
        description: (r.description as string | null) ?? '',
        lat:         r.lat != null ? parseFloat(r.lat as string) : null,
        lng:         r.lng != null ? parseFloat(r.lng as string) : null,
        sourceUrl:   (r.source_url as string | null) ?? null,
        sourceName:  (r.source_name as string | null) ?? null,
        priceFrom:   payload.price_from != null ? Number(payload.price_from) : null,
        season:      (payload.season as string | null) ?? null,
        difficulty:  (payload.difficulty as string | null) ?? null,
        durationDays: payload.duration_days != null ? Number(payload.duration_days) : null,
        bestMonths:  (payload.best_months as string[] | null) ?? null,
        altitude:    payload.altitude != null ? Number(payload.altitude) : null,
        groupSizeMax: payload.group_size_max != null ? Number(payload.group_size_max) : null,
        dangerLevel: (payload.danger_level as string | null) ?? null,
        equipment:   (r.kr_equipment as string[] | null) ?? (payload.required_equipment as string[] | null) ?? null,
        photos:      (payload.photos as string[] | null) ?? null,
        kuzmichReview: (r.kuzmich_review as string | null) ?? null,
        hasAiImage:  Boolean(r.has_ai_image),
        mchsRequired:    (r.mchs_registration_required as boolean | null) ?? false,
        mchsPhone:       (r.mchs_phone as string | null) ?? null,
        parkName:        (r.park_name as string | null) ?? null,
        parkApprovalUrl: (r.park_approval_url as string | null) ?? null,
        hazards:         (r.hazards as string[] | null) ?? null,
        distanceKm:      r.distance_km != null ? Number(r.distance_km) : null,
        elevationGainM:  r.elevation_gain_m != null ? Number(r.elevation_gain_m) : null,
        durationHours:   r.kr_duration_hours != null ? Number(r.kr_duration_hours) : null,
        createdAt:   r.created_at as string,
        offers,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Ошибка загрузки маршрута', details: process.env.NODE_ENV === 'development' ? msg : undefined },
      { status: 500 }
    );
  }
}
