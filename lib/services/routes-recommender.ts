/**
 * Routes Recommender — Translate user interests to activity_type filters
 * and fetch matching routes from /api/routes
 */

// Maps Russian keywords to activity_type values
const INTEREST_KEYWORDS: Record<string, string[]> = {
  'вулкан': ['trekking'],
  'восхожд': ['trekking'],
  'гора': ['trekking', 'hiking'],
  'рыбалк': ['fishing'],
  'рыб': ['fishing'],
  'медвед': ['bear_watching'],
  'медведь': ['bear_watching'],
  'термал': ['thermal'],
  'горячий источник': ['thermal'],
  'гейзер': ['helicopter'],
  'долина': ['helicopter', 'trekking'],
  'вертолет': ['helicopter'],
  'озеро': ['boat_trip'],
  'лодка': ['boat_trip'],
  'плав': ['boat_trip'],
  'треккинг': ['trekking'],
  'хайк': ['hiking', 'trekking'],
  'снегоход': ['snowmobile'],
  'снег': ['snowmobile'],
  'фото': ['photo'],
  'фотогра': ['photo'],
  'культур': ['cultural'],
  'музей': ['cultural'],
};

interface ParsedInterests {
  interests: string[];
  dateFrom?: string; // ISO format: YYYY-MM-DD
  dateTo?: string;
}

interface RouteResult {
  id: string;
  title: string;
  activityType?: string;
  description?: string;
  durationDays?: number;
  priceFrom?: number;
  sourceUrl?: string;
}

/**
 * Parse user message to extract interests and dates
 * E.g., "вулканы и рыбалка 6-13 июня" → { interests: ['trekking', 'fishing'], ... }
 */
export function parseInterestsFromText(text: string): ParsedInterests {
  const lower = text.toLowerCase();
  const interests = new Set<string>();

  // Extract activity interests
  for (const [keyword, types] of Object.entries(INTEREST_KEYWORDS)) {
    if (lower.includes(keyword)) {
      types.forEach(t => interests.add(t));
    }
  }

  // Try to extract dates (very simple regex)
  // Patterns: "6-13 июня", "06-13 июня", "с 6 по 13 июня"
  let dateFrom: string | undefined;
  let dateTo: string | undefined;

  const dateMatch = text.match(/(\d{1,2})\s*[-–]\s*(\d{1,2})\s*(июн|июль|авг|сен|май)/i);
  if (dateMatch) {
    const [, dayFrom, dayTo, month] = dateMatch;
    const monthNum = getMonthNumber(month);
    if (monthNum) {
      const year = new Date().getFullYear();
      dateFrom = formatDate(year, monthNum, parseInt(dayFrom));
      dateTo = formatDate(year, monthNum, parseInt(dayTo));
    }
  }

  return {
    interests: Array.from(interests),
    dateFrom,
    dateTo,
  };
}

/**
 * Fetch routes matching interests from /api/routes
 */
export async function findRoutesByInterests(
  interests: string[],
  limit: number = 3,
  baseUrl: string = 'https://tourhab.ru'
): Promise<RouteResult[]> {
  if (!interests.length) return [];

  try {
    const searchParams = new URLSearchParams({
      activity_type: interests.join(','),
      sort: 'recommended',
      limit: String(Math.min(limit, 5)),
      page: '1',
    });

    const url = `${baseUrl}/api/routes?${searchParams}`;
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
      console.error('[routes-recommender] API error:', res.status);
      return [];
    }

    const data = await res.json() as {
      data?: Array<{
        id: string;
        title: string;
        activityType?: string;
        description?: string;
        durationDays?: number;
        priceFrom?: number;
        sourceUrl?: string;
      }>;
    };

    return data.data ?? [];
  } catch (err) {
    console.error('[routes-recommender] fetch error:', err);
    return [];
  }
}

/**
 * Format routes for display in Telegram message
 */
export function formatRoutesForTelegram(routes: RouteResult[]): string {
  if (!routes.length) {
    return '<i>К сожалению, туров на выбранные даты нет. Но есть на другие месяцы!</i>';
  }

  const lines = ['<b>🔍 Подходящие туры:</b>', ''];

  routes.forEach((route, idx) => {
    const num = idx + 1;
    const duration = route.durationDays ? ` — ${route.durationDays}д` : '';
    const price = route.priceFrom ? ` | ~${Math.round(route.priceFrom / 1000)}к₽` : '';
    const url = `https://tourhab.ru/routes/${route.id}`;

    lines.push(`${num}️⃣ <b>${escapeHtml(route.title)}</b>${duration}`);
    if (route.description) {
      lines.push(`   ${escapeHtml(route.description.slice(0, 60))}...`);
    }
    lines.push(`   <a href="${url}">Подробнее →</a>${price}`);
    lines.push('');
  });

  lines.push('<i>Интересует? Напишите свой номер телефона.</i>');

  return lines.join('\n');
}

// ─ Helpers ─

function getMonthNumber(month: string): number | null {
  const lower = month.toLowerCase();
  const months: Record<string, number> = {
    'янв': 1,
    'фев': 2,
    'март': 3,
    'апр': 4,
    'май': 5,
    'июн': 6,
    'июль': 7,
    'авг': 8,
    'сен': 9,
    'окт': 10,
    'ноя': 11,
    'дек': 12,
  };
  return months[lower] ?? null;
}

function formatDate(year: number, month: number, day: number): string {
  return new Date(year, month - 1, day).toISOString().split('T')[0];
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
