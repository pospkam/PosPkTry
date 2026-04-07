/**
 * lib/ai/booking-intent.ts
 *
 * Determines whether a user message contains interest in a tour/activity,
 * then fetches matching tours from DB so the chat can surface them inline.
 */

import { pool } from '@/lib/db-pool';

export interface TourSuggestion {
  id: number;
  title: string;
  description: string | null;
  base_price: number;
  activity_type: string | null;
  location_type: string | null;
  location: string | null;
  tour_image: string | null;
  operator_name: string;
}

// Keywords that signal the user wants to find / book something concrete
const INTENT_KEYWORDS = [
  'тур', 'хочу', 'запис', 'брон', 'поездк', 'поехать',
  'рыбалк', 'вулкан', 'экскурс', 'трекк', 'поход', 'медвед',
  'источник', 'вертолёт', 'снегоход', 'морск', 'kayak',
  'fishing', 'trekking', 'helicopter', 'booking', 'tour',
];

// Maps message tokens → operator_tours.activity_type values
const ACTIVITY_MAP: Record<string, string> = {
  рыбалк: 'fishing',    fishing:    'fishing',
  трекк:  'trekking',   trekking:   'trekking',
  поход:  'trekking',   trek:       'trekking',
  сплав:  'rafting',    rafting:    'rafting',
  река:   'rafting',    river:      'rafting',
  вулкан: 'volcano',    volcano:    'volcano',
  источник:'thermal',   термал:     'thermal',
  медвед: 'bears',      bears:      'bears',
  вертолёт:'helicopter',helicopter: 'helicopter',
  морск:  'boat_trip',  boat:       'boat_trip',
  снегоход:'snowmobile',
};

// ── Detect booking/tour intent ────────────────────────────────────
export function detectTourIntent(text: string): {
  detected: boolean;
  activityType: string | null;
  rawWords: string;
} {
  const lower = text.toLowerCase();

  const detected = INTENT_KEYWORDS.some(kw => lower.includes(kw));
  if (!detected) return { detected: false, activityType: null, rawWords: '' };

  let activityType: string | null = null;
  for (const [kw, val] of Object.entries(ACTIVITY_MAP)) {
    if (lower.includes(kw)) { activityType = val; break; }
  }

  return { detected: true, activityType, rawWords: text.slice(0, 200) };
}

// ── Fetch relevant tours from DB ──────────────────────────────────
export async function findRelevantTours(
  activityType: string | null,
  rawText: string,
  limit = 3,
): Promise<TourSuggestion[]> {
  try {
    const params: unknown[] = [limit];
    let actFilter = '';
    if (activityType) {
      actFilter = `AND ot.activity_type = $2`;
      params.push(activityType);
    }

    const result = await pool.query<TourSuggestion>(
      `SELECT
         ot.id,
         ot.title,
         LEFT(ot.description, 120) AS description,
         ot.base_price,
         ot.activity_type,
         ot.location_type,
         ot.location_name AS location,
         ot.tour_image,
         p.name AS operator_name
       FROM operator_tours ot
       JOIN partners p ON ot.operator_id = p.id
       WHERE ot.deleted_at IS NULL AND ot.is_active = TRUE
       ${actFilter}
       ORDER BY ot.created_at DESC
       LIMIT $1`,
      params,
    );

    // Fallback — no activity match: try keyword search in title
    if (result.rows.length === 0 && rawText) {
      const fallback = await pool.query<TourSuggestion>(
        `SELECT
           ot.id, ot.title,
           LEFT(ot.description, 120) AS description,
           ot.base_price, ot.activity_type,
           ot.location_type, ot.location_name AS location, ot.tour_image,
           p.name AS operator_name
         FROM operator_tours ot
         JOIN partners p ON ot.operator_id = p.id
         WHERE ot.deleted_at IS NULL AND ot.is_active = TRUE
           AND ot.title ILIKE $1
         ORDER BY ot.created_at DESC
         LIMIT $2`,
        [`%${rawText.split(' ').slice(0, 3).join('%')}%`, limit],
      );
      return fallback.rows;
    }

    return result.rows;
  } catch {
    return [];
  }
}
