/**
 * Operator Tours Service
 * Business logic for tour management
 */

import { z } from 'zod';
import { query } from '@/lib/database';

// ============================================================================
// SCHEMAS
// ============================================================================

export const CreateTourSchema = z.object({
  title: z.string().min(5).max(255),
  description: z.string().max(2000).nullable().optional(),
  short_description: z.string().max(500).nullable().optional(),
  location_type: z.enum(['volcano', 'hot_spring', 'bay', 'lake', 'mountain', 'river', 'geyser', 'other']),
  activity_type: z.enum(['trekking', 'thermal', 'boat_trip', 'rafting', 'fishing', 'bears', 'helicopter', 'jeep', 'other']),
  location_name: z.string().min(3).max(255),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  base_price: z.number().positive(),
  price_old: z.number().positive().optional(),
  price_unit: z.enum(['per_tour', 'per_person', 'per_day_per_person']).default('per_tour'),
  max_participants: z.number().positive(),
  min_participants: z.number().positive().optional(),
  duration_hours: z.number().positive().optional(),
  duration_type: z.enum(['day', 'multi_day']).optional(),
  multi_day_count: z.number().positive().optional(),
  season_start: z.string().date().optional(),
  season_end: z.string().date().optional(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert']).optional(),
  included: z.array(z.string().max(200)).max(30).optional(),
  not_included: z.array(z.string().max(200)).max(30).optional(),
  what_to_bring: z.array(z.string().max(200)).max(30).optional(),
  photos: z.array(z.string().max(500)).max(20).optional(),
  tour_image: z.string().max(500).optional(),
  agent_route_id: z.string().uuid().optional(),
  weather_dependent: z.boolean().default(true),
  min_visibility_m: z.number().positive().default(1000),
  max_wind_kmh: z.number().positive().default(30),
  max_precipitation_mm: z.number().nonnegative().default(2),
  tags: z.array(z.string().max(100)).max(20).optional(),
});

// Partial + nullable for fields that can be cleared to NULL via PATCH
export const UpdateTourSchema = CreateTourSchema.partial().extend({
  description:       z.string().max(2000).nullable().optional(),
  short_description: z.string().max(500).nullable().optional(),
  price_old:         z.number().positive().nullable().optional(),
  min_participants:  z.number().positive().nullable().optional(),
  duration_hours:    z.number().positive().nullable().optional(),
  duration_type:     z.enum(['day', 'multi_day']).nullable().optional(),
  multi_day_count:   z.number().positive().nullable().optional(),
  season_start:      z.string().date().nullable().optional(),
  season_end:        z.string().date().nullable().optional(),
  difficulty:          z.enum(['easy', 'medium', 'hard', 'expert']).nullable().optional(),
  tour_image:          z.string().max(500).nullable().optional(),
  agent_route_id:      z.string().uuid().nullable().optional(),
  latitude:            z.number().min(-90).max(90).nullable().optional(),
  longitude:           z.number().min(-180).max(180).nullable().optional(),
  available_slots:     z.number().int().min(0).nullable().optional(),
  next_available_date: z.string().date().nullable().optional(),
});

export const AddAvailabilitySchema = z.object({
  dates: z.array(
    z.object({
      date: z.string().date(),
      available_slots: z.number().positive(),
      price_override: z.number().positive().optional(),
    })
  ).min(1).max(365),
});

export const PaginationSchema = z.object({
  limit: z.coerce.number().min(1).max(100).default(20),
  offset: z.coerce.number().min(0).default(0),
});

// ============================================================================
// QUERIES
// ============================================================================

export async function getToursByOperator(
  operatorId: string,
  pagination: { limit: number; offset: number } = { limit: 20, offset: 0 }
) {
  const result = await query(
    `SELECT
      t.id, t.title, t.description, t.short_description,
      t.location_type, t.activity_type, t.location_name,
      t.base_price, t.price_old, t.price_unit,
      t.max_participants, t.min_participants, t.is_active, t.is_published,
      t.duration_hours, t.duration_type, t.multi_day_count,
      t.difficulty, t.included, t.not_included, t.what_to_bring,
      t.photos, t.tour_image, t.agent_route_id,
      t.rating, t.review_count,
      t.available_slots, t.next_available_date,
      t.weather_dependent, t.season_start, t.season_end,
      COUNT(b.id) as total_bookings,
      COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.final_price ELSE 0 END), 0) as total_revenue,
      t.created_at, t.updated_at,
      COALESCE(
        (SELECT json_agg(tag ORDER BY tag) FROM operator_tour_tags WHERE tour_id = t.id),
        '[]'::json
      ) as tags
    FROM operator_tours t
    LEFT JOIN operator_bookings b ON t.id = b.operator_tour_id AND b.deleted_at IS NULL
    WHERE t.operator_id = $1 AND t.deleted_at IS NULL
    GROUP BY t.id
    ORDER BY t.created_at DESC
    LIMIT $2 OFFSET $3`,
    [operatorId, pagination.limit, pagination.offset]
  );

  const countResult = await query(
    `SELECT COUNT(*) FROM operator_tours WHERE operator_id = $1 AND deleted_at IS NULL`,
    [operatorId]
  );

  return {
    rows: result.rows,
    total: parseInt(String(countResult.rows[0]?.count ?? '0'), 10),
    limit: pagination.limit,
    offset: pagination.offset,
  };
}

export async function getTourById(tourId: bigint) {
  const result = await query(
    `SELECT t.*,
      COALESCE(
        (SELECT json_agg(tag ORDER BY tag) FROM operator_tour_tags WHERE tour_id = t.id),
        '[]'::json
      ) as tags
    FROM operator_tours t
    WHERE t.id = $1 AND t.deleted_at IS NULL LIMIT 1`,
    [tourId]
  );

  return result.rows[0] || null;
}

export async function createTour(
  operatorId: string,
  userId: string,
  input: z.infer<typeof CreateTourSchema>
) {
  const tourResult = await query(
    `INSERT INTO operator_tours (
      operator_id, title, description, short_description,
      location_type, activity_type, location_name, latitude, longitude,
      base_price, price_old, price_unit,
      max_participants, min_participants,
      duration_hours, duration_type, multi_day_count,
      season_start, season_end, difficulty,
      included, not_included, what_to_bring,
      photos, tour_image, agent_route_id,
      weather_dependent, min_visibility_m, max_wind_kmh, max_precipitation_mm,
      created_by
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,$22,$23,$24,$25,$26,$27,$28,$29,$30,$31)
    RETURNING id, title, base_price, location_type, created_at`,
    [
      operatorId,
      input.title,
      input.description || null,
      input.short_description || null,
      input.location_type,
      input.activity_type,
      input.location_name,
      input.latitude,
      input.longitude,
      input.base_price,
      input.price_old || null,
      input.price_unit,
      input.max_participants,
      input.min_participants || 1,
      input.duration_hours || null,
      input.duration_type || null,
      input.multi_day_count || null,
      input.season_start || null,
      input.season_end || null,
      input.difficulty || null,
      JSON.stringify(input.included || []),
      JSON.stringify(input.not_included || []),
      JSON.stringify(input.what_to_bring || []),
      input.photos || [],
      input.tour_image || null,
      input.agent_route_id || null,
      input.weather_dependent,
      input.min_visibility_m,
      input.max_wind_kmh,
      input.max_precipitation_mm,
      userId,
    ]
  );

  const tour = tourResult.rows[0];

  // Insert tags if provided
  if (input.tags && input.tags.length > 0) {
    for (const tag of input.tags) {
      await query(
        `INSERT INTO operator_tour_tags (tour_id, tag) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
        [tour.id, tag.trim().toLowerCase()]
      );
    }
  }

  return tour;
}

export async function addAvailability(
  tourId: bigint,
  dates: Array<{ date: string; available_slots: number; price_override?: number }>
) {
  for (const slot of dates) {
    await query(
      `INSERT INTO tour_availability (operator_tour_id, date, available_slots, base_price_override)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (operator_tour_id, date) DO UPDATE
       SET available_slots = $3, base_price_override = $4, updated_at = NOW()`,
      [tourId, slot.date, slot.available_slots, slot.price_override || null]
    );
  }
}

export async function getAvailability(tourId: bigint, fromDate: string, toDate: string) {
  const result = await query(
    `SELECT
      a.id, a.date, a.available_slots, a.booked_slots,
      a.base_price_override, a.weather_status, a.is_cancelled,
      a.cancellation_reason, a.weather_check_time,
      COALESCE(
        (SELECT json_agg(json_build_object('tour_id', alt.alternative_tour_id, 'priority', alt.priority) ORDER BY alt.priority)
         FROM tour_availability_alternatives alt WHERE alt.availability_id = a.id),
        '[]'::json
      ) as alternatives
    FROM tour_availability a
    WHERE a.operator_tour_id = $1
      AND a.date BETWEEN $2 AND $3
      AND a.deleted_at IS NULL
    ORDER BY a.date ASC`,
    [tourId, fromDate, toDate]
  );

  return result.rows;
}

export async function softDeleteTour(tourId: bigint, operatorId: string | null | undefined): Promise<boolean> {
  const result = operatorId
    ? await query(
        `UPDATE operator_tours SET deleted_at = NOW()
         WHERE id = $1 AND operator_id = $2 AND deleted_at IS NULL
         RETURNING id`,
        [tourId, operatorId]
      )
    : await query(
        `UPDATE operator_tours SET deleted_at = NOW()
         WHERE id = $1 AND deleted_at IS NULL
         RETURNING id`,
        [tourId]
      );
  return (result.rows.length ?? 0) > 0;
}
