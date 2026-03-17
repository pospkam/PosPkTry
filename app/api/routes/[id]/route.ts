/**
 * GET /api/routes/[id]
 * Один маршрут по UUID + предложения операторов из marketplace.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

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
         id, route_dedupe_key, route_id, category, location_type, activity_type,
         title, description, lat, lng, source_url, source_name, payload, created_at,
         kuzmich_review
       FROM agent_route_knowledge
       WHERE id = $1 AND is_visible = TRUE`,
      [id]
    );

    if (!result.rows[0]) {
      return NextResponse.json({ success: false, error: 'Маршрут не найден' }, { status: 404 });
    }

    const r = result.rows[0];
    const payload = (r.payload as Record<string, unknown>) ?? {};

    // Загружаем предложения операторов если маршрут привязан к kamchatka_routes
    let offers: unknown[] = [];
    if (r.route_id) {
      const offersResult = await query(
        `SELECT
           tour_id,
           tour_name,
           tour_short_desc,
           tour_price_base,
           effective_price,
           tour_duration_days,
           tour_difficulty,
           max_group_size,
           min_group_size,
           tour_rating,
           tour_review_count,
           included,
           season,
           operator_id,
           operator_name,
           operator_slug,
           operator_rating,
           operator_review_count,
           operator_verified,
           commission_rate,
           next_departure_date,
           next_departure_slots,
           marketplace_score
         FROM v_route_marketplace
         WHERE route_id = $1
         ORDER BY marketplace_score DESC`,
        [r.route_id]
      );

      offers = offersResult.rows.map(o => ({
        tourId:           o.tour_id as string,
        tourName:         o.tour_name as string,
        shortDesc:        (o.tour_short_desc as string | null) ?? null,
        priceBase:        o.tour_price_base != null ? Number(o.tour_price_base) : null,
        effectivePrice:   o.effective_price != null ? Number(o.effective_price) : null,
        durationDays:     o.tour_duration_days != null ? Number(o.tour_duration_days) : null,
        difficulty:       (o.tour_difficulty as string | null) ?? null,
        maxGroupSize:     o.max_group_size != null ? Number(o.max_group_size) : null,
        minGroupSize:     o.min_group_size != null ? Number(o.min_group_size) : null,
        rating:           o.tour_rating != null ? Number(o.tour_rating) : null,
        reviewCount:      o.tour_review_count != null ? Number(o.tour_review_count) : null,
        included:         (o.included as unknown[]) ?? [],
        season:           (o.season as unknown[]) ?? [],
        operator: {
          id:           o.operator_id as string,
          name:         o.operator_name as string,
          slug:         (o.operator_slug as string | null) ?? null,
          rating:       o.operator_rating != null ? Number(o.operator_rating) : null,
          reviewCount:  o.operator_review_count != null ? Number(o.operator_review_count) : null,
          verified:     o.operator_verified as boolean,
        },
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
        equipment:   (payload.required_equipment as string[] | null) ?? null,
        kuzmichReview: (r.kuzmich_review as string | null) ?? null,
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
