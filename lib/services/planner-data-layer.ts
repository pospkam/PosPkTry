/**
 * Planner Data Layer — all DB queries for real operator data.
 * Request-scoped cache (Map per recommendTrip call) prevents duplicate queries.
 */

import { pool } from '@/lib/db-pool';
import type { ZoneId } from '@/lib/services/trip-recommender';

// ── Cache ────────────────────────────────────────────────────────────────────

export type PlannerCache = Map<string, unknown>;

export function createPlannerCache(): PlannerCache {
  return new Map();
}

function cached<T>(cache: PlannerCache, key: string, fn: () => Promise<T>): Promise<T> {
  const hit = cache.get(key) as T | undefined;
  if (hit !== undefined) return Promise.resolve(hit);
  return fn().then(result => {
    cache.set(key, result);
    return result;
  });
}

// ── Types ────────────────────────────────────────────────────────────────────

export interface RealTour {
  tourId: string;
  title: string;
  shortDescription: string | null;
  operatorName: string;
  operatorSlug: string;
  operatorRating: number;
  operatorReviewCount: number;
  operatorVerified: boolean;
  tourRating: number | null;
  tourReviewCount: number;
  basePrice: number;
  priceUnit: string;
  maxParticipants: number;
  minParticipants: number;
  durationHours: number | null;
  difficulty: string | null;
  weatherDependent: boolean;
  seasonStart: string | null;
  seasonEnd: string | null;
  lat: number;
  lng: number;
  zone: string;
  activityType: string;
}

export interface SlotInfo {
  date: string;
  availableSlots: number;
  bookedSlots: number;
  remaining: number;
  priceOverride: number | null;
}

export interface ZoneCapacityInfo {
  tourCount: number;
  totalSlots: number;
  totalBooked: number;
  utilizationPercent: number;
}

export interface AlternativeTour {
  tourId: string;
  title: string;
  basePrice: number;
  discountPercent: number;
  priority: number;
}

export interface ReviewSignal {
  avgRating: number;
  totalReviews: number;
  verifiedReviews: number;
  recentPositivePercent: number;
}

// ── Queries ──────────────────────────────────────────────────────────────────

/**
 * Fetch real operator tours for a zone+activity, sorted by rating (not random).
 * Falls back gracefully: returns [] on error or empty results.
 */
export async function fetchRealToursForZone(
  zone: ZoneId,
  activityType: string,
  limit: number,
  cache: PlannerCache
): Promise<RealTour[]> {
  return cached(cache, `tours:${zone}:${activityType}`, async () => {
    try {
      const { rows } = await pool.query<{
        tour_id: string;
        title: string;
        short_description: string | null;
        base_price: string;
        price_unit: string;
        max_participants: number;
        min_participants: number;
        duration_hours: number | null;
        difficulty: string | null;
        weather_dependent: boolean;
        season_start: string | null;
        season_end: string | null;
        lat: number;
        lng: number;
        zone: string | null;
        activity_type: string;
        tour_rating: string | null;
        tour_review_count: string;
        operator_name: string;
        operator_slug: string;
        operator_rating: string;
        operator_review_count: string;
        operator_verified: boolean;
      }>(
        `SELECT
          ot.id AS tour_id, ot.title, ot.short_description,
          ot.base_price, ot.price_unit,
          ot.max_participants, ot.min_participants, ot.duration_hours,
          ot.difficulty, ot.weather_dependent,
          ot.season_start::text, ot.season_end::text,
          ot.latitude AS lat, ot.longitude AS lng,
          ot.activity_type,
          ark.zone,
          ot.rating AS tour_rating,
          COALESCE(ot.review_count, 0) AS tour_review_count,
          p.name AS operator_name, p.slug AS operator_slug,
          COALESCE(p.rating, 0) AS operator_rating,
          COALESCE(p.review_count, 0) AS operator_review_count,
          COALESCE(p.is_verified, false) AS operator_verified
        FROM operator_tours ot
        JOIN partners p ON p.id = ot.operator_id
        LEFT JOIN agent_route_knowledge ark ON ark.id = ot.agent_route_id
        WHERE (ark.zone = $1 OR $1 = 'avachinsky')
          AND ot.activity_type = $2
          AND ot.is_active = TRUE
          AND ot.is_published = TRUE
          AND ot.deleted_at IS NULL
          AND p.is_public = TRUE
        ORDER BY
          COALESCE(ot.rating, 0) DESC,
          COALESCE(p.rating, 0) DESC,
          ot.review_count DESC NULLS LAST,
          RANDOM()
        LIMIT $3`,
        [zone, activityType, limit]
      );

      return rows.map(r => ({
        tourId: r.tour_id,
        title: r.title,
        shortDescription: r.short_description,
        operatorName: r.operator_name,
        operatorSlug: r.operator_slug,
        operatorRating: parseFloat(String(r.operator_rating)) || 0,
        operatorReviewCount: parseInt(String(r.operator_review_count), 10) || 0,
        operatorVerified: r.operator_verified,
        tourRating: r.tour_rating ? parseFloat(String(r.tour_rating)) : null,
        tourReviewCount: parseInt(String(r.tour_review_count), 10) || 0,
        basePrice: parseFloat(String(r.base_price)) || 0,
        priceUnit: r.price_unit ?? 'per_person',
        maxParticipants: r.max_participants ?? 20,
        minParticipants: r.min_participants ?? 1,
        durationHours: r.duration_hours,
        difficulty: r.difficulty,
        weatherDependent: r.weather_dependent ?? false,
        seasonStart: r.season_start,
        seasonEnd: r.season_end,
        lat: parseFloat(String(r.lat)) || 53.01,
        lng: parseFloat(String(r.lng)) || 158.65,
        zone: r.zone ?? zone,
        activityType: r.activity_type ?? activityType,
      }));
    } catch {
      return [];
    }
  });
}

/**
 * Check slot availability for a specific tour in a date range.
 */
export async function fetchAvailabilityForTour(
  tourId: string,
  dateFrom: string,
  dateTo: string,
  cache: PlannerCache
): Promise<SlotInfo[]> {
  return cached(cache, `avail:${tourId}:${dateFrom}:${dateTo}`, async () => {
    try {
      const { rows } = await pool.query<{
        date: string;
        available_slots: number;
        booked_slots: number;
        remaining: number;
        price_override: number | null;
      }>(
        `SELECT
          date::text,
          available_slots,
          COALESCE(booked_slots, 0) AS booked_slots,
          (available_slots - COALESCE(booked_slots, 0)) AS remaining,
          base_price_override AS price_override
        FROM tour_availability
        WHERE operator_tour_id = $1
          AND date BETWEEN $2::date AND $3::date
          AND is_cancelled = FALSE
          AND available_slots > COALESCE(booked_slots, 0)
        ORDER BY date ASC`,
        [tourId, dateFrom, dateTo]
      );

      return rows.map(r => ({
        date: r.date,
        availableSlots: r.available_slots,
        bookedSlots: r.booked_slots,
        remaining: r.remaining,
        priceOverride: r.price_override,
      }));
    } catch {
      return [];
    }
  });
}

/**
 * Aggregate capacity utilization for a zone in a date range.
 */
export async function fetchZoneCapacity(
  zone: ZoneId,
  dateFrom: string,
  dateTo: string,
  cache: PlannerCache
): Promise<ZoneCapacityInfo> {
  return cached(cache, `cap:${zone}:${dateFrom}:${dateTo}`, async () => {
    try {
      const { rows } = await pool.query<{
        tour_count: string;
        total_slots: string;
        total_booked: string;
      }>(
        `SELECT
          COUNT(DISTINCT ot.id) AS tour_count,
          COALESCE(SUM(ta.available_slots), 0) AS total_slots,
          COALESCE(SUM(COALESCE(ta.booked_slots, 0)), 0) AS total_booked
        FROM operator_tours ot
        LEFT JOIN agent_route_knowledge ark ON ark.id = ot.agent_route_id
        LEFT JOIN tour_availability ta ON ta.operator_tour_id = ot.id
          AND ta.date BETWEEN $2::date AND $3::date
          AND ta.is_cancelled = FALSE
        WHERE ark.zone = $1
          AND ot.is_active = TRUE
          AND ot.is_published = TRUE
          AND ot.deleted_at IS NULL`,
        [zone, dateFrom, dateTo]
      );

      const r = rows[0];
      const totalSlots = parseInt(String(r?.total_slots ?? '0'), 10);
      const totalBooked = parseInt(String(r?.total_booked ?? '0'), 10);
      return {
        tourCount: parseInt(String(r?.tour_count ?? '0'), 10),
        totalSlots,
        totalBooked,
        utilizationPercent: totalSlots > 0 ? Math.round((totalBooked / totalSlots) * 100) : 0,
      };
    } catch {
      return { tourCount: 0, totalSlots: 0, totalBooked: 0, utilizationPercent: 0 };
    }
  });
}

/**
 * Get contingency alternatives for a tour.
 */
export async function fetchContingencyAlternatives(
  tourId: string,
  cache: PlannerCache
): Promise<AlternativeTour[]> {
  return cached(cache, `alt:${tourId}`, async () => {
    try {
      const { rows } = await pool.query<{
        tour_id: string;
        title: string;
        base_price: string;
        discount_percent: number;
        priority: number;
      }>(
        `SELECT
          cr.alternative_tour_id AS tour_id,
          ot.title, ot.base_price,
          cr.discount_percent, cr.priority
        FROM contingency_rules cr
        JOIN operator_tours ot ON ot.id = cr.alternative_tour_id
        WHERE cr.primary_tour_id = $1
          AND cr.is_active = TRUE
          AND ot.is_active = TRUE
          AND ot.deleted_at IS NULL
        ORDER BY cr.priority ASC
        LIMIT 3`,
        [tourId]
      );

      return rows.map(r => ({
        tourId: r.tour_id,
        title: r.title,
        basePrice: parseFloat(String(r.base_price)) || 0,
        discountPercent: r.discount_percent ?? 0,
        priority: r.priority,
      }));
    } catch {
      return [];
    }
  });
}

/**
 * Get review quality signals for a tour or operator.
 */
export async function fetchReviewSignals(
  tourId: string,
  cache: PlannerCache
): Promise<ReviewSignal | null> {
  return cached(cache, `rev:${tourId}`, async () => {
    try {
      const { rows } = await pool.query<{
        avg_rating: string;
        total_reviews: string;
        verified_reviews: string;
        recent_positive_percent: string;
      }>(
        `SELECT
          COALESCE(AVG(rating), 0) AS avg_rating,
          COUNT(*) AS total_reviews,
          COUNT(*) FILTER (WHERE is_verified = TRUE) AS verified_reviews,
          COALESCE(
            COUNT(*) FILTER (WHERE rating >= 4 AND created_at > NOW() - INTERVAL '6 months') * 100.0 /
            NULLIF(COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '6 months'), 0),
            0
          ) AS recent_positive_percent
        FROM reviews
        WHERE tour_id = $1`,
        [tourId]
      );

      const r = rows[0];
      if (!r) return null;
      const total = parseInt(String(r.total_reviews), 10);
      if (total === 0) return null;

      return {
        avgRating: parseFloat(String(r.avg_rating)) || 0,
        totalReviews: total,
        verifiedReviews: parseInt(String(r.verified_reviews), 10) || 0,
        recentPositivePercent: parseFloat(String(r.recent_positive_percent)) || 0,
      };
    } catch {
      return null;
    }
  });
}
