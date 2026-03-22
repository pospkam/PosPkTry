/**
 * Routes Recommender — парсинг интересов туриста → подбор маршрутов
 * Поддерживает: сезонность, расширенный словарь активностей
 */

// ── Словарь: ключевые слова → activity_type ───────────────────────────────────

const INTEREST_KEYWORDS: Record<string, string[]> = {
  // Вулканы / треккинг
  'вулкан':       ['trekking'],
  'восхожден':    ['trekking'],
  'авачинск':     ['trekking'],
  'мутновск':     ['trekking'],
  'горел':        ['trekking'],
  'ключевск':     ['trekking'],
  'вилючинск':    ['trekking'],
  'корякск':      ['trekking'],
  'треккинг':     ['trekking'],
  'хайк':         ['trekking'],
  'поход':        ['trekking'],
  'пеш':          ['trekking'],
  'маршрут':      ['trekking'],
  'гора':         ['trekking'],
  'перевал':      ['trekking'],

  // Рыбалка
  'рыбалк':       ['fishing'],
  'рыбачить':     ['fishing'],
  'рыболов':      ['fishing'],
  'чавыча':       ['fishing'],
  'нерка':        ['fishing'],
  'кижуч':        ['fishing'],
  'лосось':       ['fishing'],
  'хариус':       ['fishing'],
  'голец':        ['fishing'],
  'треска':       ['fishing'],
  'палтус':       ['fishing'],
  'краб':         ['fishing', 'boat_trip'],

  // Медведи / дикая природа
  'медвед':       ['bear_watching'],
  'мишк':         ['bear_watching'],
  'курильское':   ['bear_watching', 'helicopter'],
  'дикая природа':['bear_watching', 'eco'],
  'фауна':        ['bear_watching', 'eco'],
  'нерест':       ['bear_watching', 'fishing'],

  // Термальные источники
  'термал':       ['thermal'],
  'горячий источник': ['thermal'],
  'горячие':      ['thermal'],
  'источник':     ['thermal'],
  'паратунка':    ['thermal'],
  'налычево':     ['thermal', 'trekking'],
  'ходутка':      ['thermal', 'helicopter'],
  'купать':       ['thermal'],
  'сероводород':  ['thermal'],

  // Гейзеры / вертолёт
  'гейзер':       ['helicopter'],
  'долина гейзер':['helicopter'],
  'кроноцк':      ['helicopter'],
  'вертолет':     ['helicopter'],
  'вертолёт':     ['helicopter'],
  'авиатур':      ['helicopter'],

  // Море / лодка
  'море':         ['boat_trip'],
  'лодка':        ['boat_trip'],
  'катер':        ['boat_trip'],
  'яхт':          ['boat_trip'],
  'бухт':         ['boat_trip'],
  'косатк':       ['boat_trip'],
  'кит':          ['boat_trip'],
  'морска рыбал': ['boat_trip', 'fishing'],
  'морской':      ['boat_trip'],
  'авачинская бухта': ['boat_trip'],

  // Снегоходы / зима
  'снегоход':     ['snowmobile'],
  'снежн':        ['snowmobile'],
  'зима':         ['snowmobile', 'ski'],
  'зимний':       ['snowmobile', 'ski'],
  'лыж':          ['ski'],
  'сноуборд':     ['ski'],
  'подлёдная':    ['fishing'],
  'подледн':      ['fishing'],

  // Серфинг / дайвинг
  'серф':         ['surf'],
  'халактыр':     ['surf'],
  'дайвинг':      ['diving'],
  'подводн':      ['diving'],
  'ныряние':      ['diving'],

  // Экология / фото
  'эко':          ['eco'],
  'экологическ':  ['eco'],
  'фото':         ['photo'],
  'фотограф':     ['photo'],
  'пейзаж':       ['photo'],
  'закат':        ['photo'],
  'рассвет':      ['photo'],

  // Культура
  'культур':      ['cultural'],
  'музей':        ['cultural'],
  'история':      ['cultural'],
  'коренн':       ['cultural'],
  'ительмен':     ['cultural'],

  // Джип / внедорожник
  'джип':         ['jeep'],
  'внедорожник':  ['jeep'],
  'квадроцикл':   ['jeep'],

  // Кемпинг
  'кемпинг':      ['camping'],
  'палатк':       ['camping'],
  'ночевка':      ['camping'],
  'ночлег':       ['camping'],
};

// ── Сезонность: какие активности НЕДОСТУПНЫ в каком месяце ───────────────────

export const SEASON_BLOCKED: Record<number, string[]> = {
  // Зима (декабрь-февраль): нет моря, медведи спят, нет серфа, нет дайвинга
  12: ['boat_trip', 'bear_watching', 'surf', 'diving', 'camping'],
  1:  ['boat_trip', 'bear_watching', 'surf', 'diving', 'camping'],
  2:  ['boat_trip', 'bear_watching', 'surf', 'diving', 'camping'],

  // Ранняя весна (март-апрель): ещё снег, снегоходы можно, море закрыто
  3:  ['boat_trip', 'bear_watching', 'surf', 'diving', 'camping'],
  4:  ['bear_watching', 'surf', 'diving'],

  // Поздняя весна (май): снегоходы уже нет, всё открывается
  5:  ['snowmobile', 'ski'],

  // Лето (июнь-август): нет снегоходов и лыж
  6:  ['snowmobile', 'ski'],
  7:  ['snowmobile', 'ski'],
  8:  ['snowmobile', 'ski'],

  // Осень (сентябрь-ноябрь): нет снегоходов, серфа
  9:  ['snowmobile', 'ski', 'surf', 'diving'],
  10: ['snowmobile', 'ski', 'surf', 'diving', 'boat_trip'],
  11: ['snowmobile', 'ski', 'surf', 'diving', 'boat_trip', 'camping'],
};

// ── Типы данных ──────────────────────────────────────────────────────────────

export interface ParsedInterests {
  interests: string[];
  dateFrom?: string;
  dateTo?: string;
}

export interface RouteResult {
  id: string;
  title: string;
  activityType?: string;
  description?: string;
  durationDays?: number;
  priceFrom?: number;
  sourceUrl?: string;
}

// ── Парсинг интересов и дат из текста ────────────────────────────────────────

export function parseInterestsFromText(text: string): ParsedInterests {
  const lower = text.toLowerCase();
  const interests = new Set<string>();

  for (const [keyword, types] of Object.entries(INTEREST_KEYWORDS)) {
    if (lower.includes(keyword)) {
      types.forEach(t => interests.add(t));
    }
  }

  // Парсинг дат: "6-13 июня", "с 6 по 13 июля", "20-27 августа"
  let dateFrom: string | undefined;
  let dateTo: string | undefined;

  const patterns = [
    /с\s+(\d{1,2})\s+по\s+(\d{1,2})\s+(январ|феврал|март|апрел|май|июн|июл|август|сентябр|октябр|ноябр|декабр)/i,
    /(\d{1,2})\s*[-–—]\s*(\d{1,2})\s+(январ|феврал|март|апрел|май|июн|июл|август|сентябр|октябр|ноябр|декабр)/i,
    /прилет\w*\s+(\d{1,2})\s*(июн|июл|авг|сен|окт|ноя|дек|янв|фев|мар|апр|май)/i,
  ];

  for (const pattern of patterns) {
    const m = text.match(pattern);
    if (m) {
      const dayFrom = parseInt(m[1]);
      const dayTo = m[2] ? parseInt(m[2]) : dayFrom + 7;
      const monthNum = getMonthNumber(m[m[2] ? 3 : 2]);
      if (monthNum) {
        const year = new Date().getFullYear();
        dateFrom = formatDate(year, monthNum, dayFrom);
        dateTo = formatDate(year, monthNum, dayTo);
      }
      break;
    }
  }

  // Фильтруем интересы по сезону если дата известна
  const filteredInterests = filterBySeasonality(Array.from(interests), dateFrom);

  return { interests: filteredInterests, dateFrom, dateTo };
}

// ── Фильтр по сезонности ─────────────────────────────────────────────────────

export function filterBySeasonality(interests: string[], dateFrom?: string): string[] {
  if (!dateFrom) return interests;

  const month = new Date(dateFrom).getMonth() + 1; // 1-12
  const blocked = SEASON_BLOCKED[month] ?? [];

  return interests.filter(i => !blocked.includes(i));
}

// ── Поиск маршрутов по интересам ──────────────────────────────────────────────

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

    const res = await fetch(`${baseUrl}/api/routes?${searchParams}`, {
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });

    if (!res.ok) {
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
    return [];
  }
}

// ── Форматирование туров для Telegram ─────────────────────────────────────────

export function formatRoutesForTelegram(routes: RouteResult[]): string {
  if (!routes.length) {
    return '<i>К сожалению, туров на выбранные даты нет. Есть варианты на другие месяцы!</i>';
  }

  const lines = ['<b>🔍 Подходящие туры:</b>', ''];

  routes.forEach((route, idx) => {
    const duration = route.durationDays ? ` — ${route.durationDays}д` : '';
    const price = route.priceFrom ? ` | ~${Math.round(route.priceFrom / 1000)}к₽` : '';
    const url = `https://tourhab.ru/routes/${route.id}`;

    lines.push(`${idx + 1}️⃣ <b>${escapeHtml(route.title)}</b>${duration}`);
    if (route.description) {
      lines.push(`   ${escapeHtml(route.description.slice(0, 60))}...`);
    }
    lines.push(`   <a href="${url}">Подробнее →</a>${price}`);
    lines.push('');
  });

  lines.push('<i>Интересует? Напишите свой номер телефона.</i>');
  return lines.join('\n');
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getMonthNumber(month: string): number | null {
  const lower = month.toLowerCase();
  const months: Record<string, number> = {
    'янв': 1, 'феврал': 2, 'фев': 2,
    'март': 3, 'мар': 3, 'апрел': 4, 'апр': 4,
    'май': 5, 'июн': 6, 'июл': 7, 'июль': 7,
    'август': 8, 'авг': 8, 'сентябр': 9, 'сен': 9,
    'октябр': 10, 'окт': 10, 'ноябр': 11, 'ноя': 11,
    'декабр': 12, 'дек': 12,
  };
  // Проверяем по частичному совпадению
  for (const [key, num] of Object.entries(months)) {
    if (lower.startsWith(key)) return num;
  }
  return null;
}

function formatDate(year: number, month: number, day: number): string {
  return new Date(year, month - 1, day).toISOString().split('T')[0];
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
