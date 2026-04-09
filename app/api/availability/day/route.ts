/**
 * GET /api/availability/day?date=YYYY-MM-DD[&activity=trekking]
 *
 * Публичный. Возвращает все туры с открытыми слотами на конкретную дату.
 * Используется в публичном календаре при клике на день.
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

interface TourRow {
  tour_id: string;
  title: string;
  description: string | null;
  activity_type: string | null;
  location_name: string | null;
  base_price: string;
  price_override: string | null;
  duration_hours: string | null;
  duration_type: string | null;
  max_participants: number;
  min_participants: number;
  available_slots: number;
  booked_slots: number;
  free_slots: number;
  weather_status: string;
  operator_id: string;
  operator_name: string;
  operator_verified: boolean | null;
  operator_rating: string | null;
  tags: string[] | null;
}

const ACTIVITY_RU: Record<string, string> = {
  trekking: 'Треккинг', fishing: 'Рыбалка', bear_watching: 'Медведи',
  helicopter: 'Вертолёт', thermal: 'Термальные', boat_trip: 'Морская прогулка',
  snowmobile: 'Снегоход', jeep: 'Джип-тур', eco: 'Эко-тур',
  diving: 'Дайвинг', ski: 'Фрирайд', cultural: 'Культура',
  photo: 'Фототур', camping: 'Кемпинг', other: 'Активный отдых',
};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date     = searchParams.get('date');
  const activity = searchParams.get('activity') ?? null;

  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ success: false, error: 'Параметр date обязателен (YYYY-MM-DD)' }, { status: 400 });
  }

  // Не показываем прошлое
  const today = new Date().toISOString().slice(0, 10);
  if (date < today) {
    return NextResponse.json({ success: true, date, tours: [] });
  }

  const params: unknown[] = [date];
  let activityFilter = '';
  if (activity) {
    params.push(activity);
    activityFilter = `AND t.activity_type = $${params.length}`;
  }

  try {
    const { rows } = await pool.query<TourRow>(
      `SELECT
         t.id::text                                                           AS tour_id,
         t.title,
         t.description,
         t.activity_type,
         t.location_name,
         t.base_price::text,
         ta.base_price_override::text                                        AS price_override,
         t.duration_hours::text,
         t.duration_type,
         t.max_participants,
         t.min_participants,
         ta.available_slots,
         ta.booked_slots,
         (ta.available_slots - ta.booked_slots)                             AS free_slots,
         ta.weather_status,
         p.id::text                                                          AS operator_id,
         p.name                                                              AS operator_name,
         p.is_verified                                                       AS operator_verified,
         p.rating::text                                                      AS operator_rating,
         t.tags
       FROM tour_availability ta
       JOIN operator_tours t ON ta.operator_tour_id = t.id
       JOIN partners p       ON t.operator_id = p.id
       WHERE ta.date = $1
         AND ta.is_cancelled = false
         AND (ta.available_slots - ta.booked_slots) > 0
         AND t.is_active = true
         AND t.is_published = true
         ${activityFilter}
       ORDER BY
         COALESCE(ta.base_price_override, t.base_price) ASC,
         (ta.available_slots - ta.booked_slots) DESC`,
      params
    );

    const tours = rows.map(r => ({
      tourId:         Number(r.tour_id),
      title:          r.title,
      description:    r.description?.slice(0, 200) ?? null,
      activityType:   r.activity_type,
      activityLabel:  r.activity_type ? (ACTIVITY_RU[r.activity_type] ?? r.activity_type) : null,
      locationName:   r.location_name,
      price:          r.price_override !== null ? Number(r.price_override) : Number(r.base_price),
      durationHours:  r.duration_hours !== null ? Number(r.duration_hours) : null,
      durationType:   r.duration_type,
      maxParticipants: r.max_participants,
      minParticipants: r.min_participants,
      availableSlots:  r.available_slots,
      bookedSlots:     r.booked_slots,
      freeSlots:       r.free_slots,
      weatherStatus:   r.weather_status,
      operator: {
        id:       r.operator_id,
        name:     r.operator_name,
        verified: r.operator_verified ?? false,
        rating:   r.operator_rating !== null ? Number(r.operator_rating) : null,
      },
      tags: r.tags ?? [],
    }));

    return NextResponse.json({ success: true, date, tours });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ошибка';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
