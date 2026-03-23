/**
 * Planner constants — single source of truth.
 * Used by: trip-recommender, planner chat, tourist-agency, PlannerClient.
 */

export const PLANNER_PLACE_IDS = [
  'volcano', 'hot_spring', 'geyser', 'sea', 'mountain', 'river',
] as const;

export const PLANNER_ACTIVITY_IDS = [
  'trekking', 'fishing', 'helicopter', 'bears', 'snowmobile', 'boat_trip', 'rafting',
] as const;

export type PlannerPlaceId = typeof PLANNER_PLACE_IDS[number];
export type PlannerActivityId = typeof PLANNER_ACTIVITY_IDS[number];

/** Map legacy/recommender names to canonical place IDs */
export const RECOMMENDER_TO_PLACES: Record<string, string> = {
  thermal: 'hot_spring',
};

// ─── Zones (canonical IDs match DB: agent_route_knowledge.zone) ───────────────

export type ZoneId = 'avachinsky' | 'western' | 'eastern' | 'northern';
export const ZONE_IDS: ZoneId[] = ['avachinsky', 'western', 'eastern', 'northern'];

export const ZONE_LABEL: Record<ZoneId, string> = {
  avachinsky: 'Авачинская — вулканы',
  western:    'Западная — рыбалка',
  eastern:    'Восточная — медведи',
  northern:   'Северная — гейзеры',
};

export const ZONE_COLORS: Record<ZoneId, string> = {
  avachinsky: 'var(--accent)',
  eastern:    'var(--ocean)',
  northern:   'var(--success)',
  western:    '#a855f7',
};

export const ZONE_COORDS: Record<ZoneId, [number, number]> = {
  avachinsky: [52.80, 158.80],
  western:    [55.33, 157.12],
  eastern:    [55.20, 161.42],
  northern:   [57.73, 158.71],
};

type TransportType = 'walking' | 'jeep' | 'helicopter' | 'boat';
export const ZONE_TRANSPORTS: Record<ZoneId, TransportType[]> = {
  avachinsky: ['walking', 'jeep', 'helicopter'],
  western:    ['walking', 'jeep', 'boat'],
  eastern:    ['walking', 'jeep', 'helicopter', 'boat'],
  northern:   ['walking', 'jeep', 'helicopter'],
};

export const ZONE_DOT_ICONS: Record<ZoneId, string> = {
  avachinsky: 'islands#orangeDotIcon',
  eastern:    'islands#blueDotIcon',
  northern:   'islands#greenDotIcon',
  western:    'islands#violetDotIcon',
};

export const ACTIVITY_LABEL: Record<string, string> = {
  trekking:   'Треккинг',
  fishing:    'Рыбалка',
  helicopter: 'Вертолёт',
  bears:      'Медведи',
  snowmobile: 'Снегоходы',
  rafting:    'Сплав',
  boat_trip:  'Морской тур',
  volcano:    'Вулкан',
  hot_spring: 'Термальные',
  geyser:     'Гейзеры',
  sea:        'Побережье',
  mountain:   'Горы',
  river:      'Реки',
};

/** SEA-related activity types (affected by seasickness) */
export const SEA_ACTIVITIES = new Set(['boat_trip', 'sea', 'fishing']);

/** Activities requiring high physical fitness */
export const HARD_ACTIVITIES = new Set(['volcano', 'mountain', 'trekking']);
