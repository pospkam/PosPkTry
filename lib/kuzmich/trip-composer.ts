/**
 * lib/kuzmich/trip-composer.ts
 *
 * Trip Composer — подбирает комплексный маршрут из нескольких туров под параметры туриста:
 * количество дней, бюджет, интересы, месяц, размер группы.
 *
 * Логика:
 * 1. Ищет туры по интересам и фильтрам
 * 2. Жадно компонует непересекающиеся туры (pack by day-count)
 * 3. Добавляет свободные дни между турами для переездов
 * 4. Возвращает готовый итинерарий с ценами и ссылками
 */

import { pool } from '@/lib/db-pool';
import { callAIFast } from '@/lib/ai/providers';
import { fetchWeatherForecast } from '@/lib/services/planner-intelligence';
import type { ChatMessage } from '@/lib/ai/prompts';

// Активности, которые НЕ зависят от погоды — хорошие План Б
const INDOOR_ACTIVITIES = new Set(['thermal', 'cultural', 'museum']);

// Активности, которые ломаются в плохую погоду — нужен План Б  
const WEATHER_SENSITIVE = new Set(['helicopter', 'boat_trip', 'bears', 'volcano', 'trekking', 'rafting']);

// WMO коды плохой погоды (дождь, шторм, гроза, снег)
const BAD_WEATHER_CODES = new Set([51, 53, 55, 61, 63, 65, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99]);

export interface TripTour {
  id: number;
  title: string;
  activity_type: string | null;
  duration_days: number;
  base_price: number;
  operator_name: string;
  location: string | null;
  difficulty_level: string | null;
  tour_image: string | null;
  booking_url: string;
  reasoning?: string; // почему именно этот тур рекомендуется данному туристу
}

export interface TripDay {
  day: number;
  type: 'tour' | 'travel' | 'free';
  tour?: TripTour;
  note: string;
  planB?: TripTour; // альтернатива на случай плохой погоды (внутренняя активность)
  planBReason?: string; // почему предлагаётся альтернатива (дождь, ветер и т.д.)
}

export interface ComposedTrip {
  total_days: number;
  tour_days: number;
  free_days: number;
  total_price: number;
  price_per_person: number;
  group_size: number;
  tours: TripTour[];
  itinerary: TripDay[];
  summary: string;
}

interface TourRow {
  id: number;
  title: string;
  activity_type: string | null;
  duration_days: number;
  base_price: number;
  operator_name: string;
  location: string | null;
  difficulty: string | null;
  tour_image: string | null;
}

// Сезонная доступность активностей
const SEASONAL_ACTIVITIES: Record<string, number[]> = {
  helicopter: [6, 7, 8, 9],
  skiing:     [1, 2, 3, 4],
  snowmobile: [1, 2, 3, 4, 12],
  bears:      [7, 8, 9],
  fishing:    [5, 6, 7, 8, 9, 10],
  trekking:   [5, 6, 7, 8, 9, 10],
  volcano:    [5, 6, 7, 8, 9, 10],
  thermal:    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  boat_trip:  [6, 7, 8, 9],
  rafting:    [6, 7, 8, 9],
};

function isInSeason(activityType: string | null, month: number): boolean {
  if (!activityType) return true;
  const months = SEASONAL_ACTIVITIES[activityType];
  if (!months) return true;
  return months.includes(month);
}

// Переводы активностей для итинерария
const ACTIVITY_LABELS: Record<string, string> = {
  fishing:    'Рыбалка',
  trekking:   'Треккинг',
  volcano:    'Вулканы',
  thermal:    'Горячие источники',
  bears:      'Медведи',
  helicopter: 'Вертолётный тур',
  boat_trip:  'Морской тур',
  rafting:    'Рафтинг',
  snowmobile: 'Снегоходы',
  skiing:     'Лыжи',
  photo:      'Фototур',
  cultural:   'Культурный тур',
};

export interface ComposeTripParams {
  total_days: number;
  budget_total: number;
  interests: string[];   // activity_type values
  month: number;         // 1-12
  group_size: number;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export async function composeTrip(params: ComposeTripParams): Promise<ComposedTrip | null> {
  const { total_days, budget_total, interests, month, group_size, difficulty } = params;

  // Строим фильтр по интересам (с сезоном)
  const seasonalInterests = interests.filter(i => isInSeason(i, month));
  if (seasonalInterests.length === 0) {
    // Fallback — бери что есть в сезоне
    seasonalInterests.push('trekking', 'thermal');
  }

  const placeholders = seasonalInterests.map((_, i) => `$${i + 1}`).join(',');
  const extraParams: unknown[] = [...seasonalInterests];

  let difficultyClause = '';
  if (difficulty) {
    extraParams.push(difficulty);
    difficultyClause = `AND t.difficulty = $${extraParams.length}`;
  }

  // Бюджет на человека
  const budgetPerPerson = Math.floor(budget_total / group_size);
  extraParams.push(budgetPerPerson);
  const budgetIdx = extraParams.length;

  extraParams.push(total_days);
  const maxDaysIdx = extraParams.length;

  const durationExpr = `COALESCE(t.multi_day_count, CEIL(t.duration_hours / 24.0)::int, 1)`;

  const sql = `
    SELECT t.id, t.title, t.activity_type,
           ${durationExpr} AS duration_days,
           t.base_price,
           COALESCE(u.company_name, u.name) AS operator_name,
           t.location_name AS location, t.difficulty, t.tour_image
    FROM operator_tours t
    JOIN users u ON u.id = t.operator_id
    WHERE t.is_published = true
      AND t.is_active = true
      AND t.activity_type IN (${placeholders})
      AND t.base_price <= $${budgetIdx}
      AND ${durationExpr} <= $${maxDaysIdx}
      ${difficultyClause}
    ORDER BY t.activity_type, t.base_price ASC
    LIMIT 20
  `;

  let rows: TourRow[];
  try {
    const result = await pool.query<TourRow>(sql, extraParams);
    rows = result.rows;
  } catch {
    return null;
  }

  if (rows.length === 0) return null;

  // Жадная компоновка: выбираем по одному туру каждого типа активности,
  // не превышая total_days и budget_total
  const usedActivities = new Set<string>();
  const selected: TripTour[] = [];
  let usedDays = 0;
  let usedBudget = 0;

  // Оставляем 1 день между турами для переезда (если туров > 1)
  const travelDaysBetween = (count: number) => Math.max(0, count - 1);

  for (const row of rows) {
    const activity = row.activity_type ?? 'other';
    if (usedActivities.has(activity)) continue;

    const tourDays = row.duration_days;
    const travelDays = travelDaysBetween(selected.length + 1);
    const totalNeeded = usedDays + tourDays + (selected.length > 0 ? 1 : 0); // +1 день переезда
    const totalBudgetNeeded = usedBudget + row.base_price * group_size;

    if (totalNeeded > total_days) continue;
    if (totalBudgetNeeded > budget_total * 1.1) continue; // 10% запас

    selected.push({
      id: row.id,
      title: row.title,
      activity_type: activity,
      duration_days: tourDays,
      base_price: row.base_price,
      operator_name: row.operator_name,
      location: row.location,
      difficulty_level: row.difficulty,
      tour_image: row.tour_image,
      booking_url: `/routes/${row.id}`,
    });
    usedActivities.add(activity);
    usedDays += tourDays + (selected.length > 1 ? 1 : 0);
    usedBudget += row.base_price * group_size;
  }

  if (selected.length === 0) return null;

  // Строим итинерарий день за днём
  const itinerary: TripDay[] = [];
  let currentDay = 1;

  for (let i = 0; i < selected.length; i++) {
    const tour = selected[i];

    // День переезда между турами
    if (i > 0) {
      itinerary.push({
        day: currentDay,
        type: 'travel',
        note: `Переезд и подготовка к следующему туру (${ACTIVITY_LABELS[tour.activity_type ?? ''] ?? tour.activity_type}).`,
      });
      currentDay++;
    }

    // Дни тура
    for (let d = 0; d < tour.duration_days; d++) {
      itinerary.push({
        day: currentDay,
        type: 'tour',
        tour,
        note: d === 0
          ? `Начало тура: ${tour.title}. Место: ${tour.location ?? 'Камчатка'}. Оператор: ${tour.operator_name}.`
          : d === tour.duration_days - 1
            ? `Завершение тура "${tour.title}". Возвращение.`
            : `Тур "${tour.title}" — день ${d + 1}.`,
      });
      currentDay++;
    }
  }

  // Свободные дни в конце
  const freeDays = total_days - (currentDay - 1);
  for (let d = 0; d < freeDays; d++) {
    itinerary.push({
      day: currentDay + d,
      type: 'free',
      note: 'Свободное время: горячие источники, рынок, рестораны Петропавловска-Камчатского.',
    });
  }

  const tourDaysTotal = selected.reduce((s, t) => s + t.duration_days, 0);
  const travelDaysTotal = selected.length > 1 ? selected.length - 1 : 0;
  const freeDaysTotal = total_days - tourDaysTotal - travelDaysTotal;
  const totalPrice = selected.reduce((s, t) => s + t.base_price * group_size, 0);

  // План Б: проверка погоды и предложение альтернатив на случай плохой погоды (fire-and-forget)
  void addWeatherPlanB(itinerary, selected, total_days, group_size, budget_total);

  const activityLabels = selected.map(t => ACTIVITY_LABELS[t.activity_type ?? ''] ?? t.activity_type).join(', ');
  const summary =
    `Маршрут на ${total_days} дней для группы ${group_size} чел. ` +
    `Включает: ${activityLabels}. ` +
    `Итого: ${totalPrice.toLocaleString('ru-RU')} руб. (${Math.round(totalPrice / group_size).toLocaleString('ru-RU')} руб/чел). ` +
    `Свободных дней: ${freeDaysTotal}.`;

  // AI-объяснение для каждого тура: почему именно этот тур подходит туристу
  void generateTourReasoning(selected, { interests, month, group_size, budget_total, difficulty });

  return {
    total_days,
    tour_days: tourDaysTotal,
    free_days: freeDaysTotal,
    total_price: totalPrice,
    price_per_person: Math.round(totalPrice / group_size),
    group_size,
    tours: selected,
    itinerary,
    summary,
  };
}

const MONTH_NAMES = ['','январь','февраль','март','апрель','май','июнь','июль','август','сентябрь','октябрь','ноябрь','декабрь'];

/**
 * Fire-and-forget AI reasoning для каждого тура в маршруте.
 * Объясняет туристу почему именно этот тур ему подходит.
 */
async function generateTourReasoning(
  tours: TripTour[],
  params: { interests: string[]; month: number; group_size: number; budget_total: number; difficulty?: string },
): Promise<void> {
  if (tours.length === 0) return;

  const context = [
    `Турист едет на ${params.month ? MONTH_NAMES[params.month] ?? 'месяц' : 'Камчатку'}.`,
    `Интересы: ${params.interests.join(', ') || 'разнообразный отдых'}.`,
    `Группа: ${params.group_size} чел.`,
    `Бюджет на всё: ${params.budget_total.toLocaleString('ru-RU')} руб.`,
    params.difficulty ? `Уровень сложности: ${params.difficulty}.` : '',
  ].filter(Boolean).join(' ');

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: `Ты — эксперт по туризму на Камчатке. Для каждого предложенного тура напиши 1-2 предложения на русском: ПОЧЕМУ именно этот тур подходит данному туристу, учитывая его интересы, бюджет, сезон и группу. Будь конкретным: упомяни уникальную деталь тура, совпадение с интересами, выгоду по цене или сезону. Не используй markdown и emoji.`,
    },
    {
      role: 'user',
      content: `Контекст туриста: ${context}

Туры:
${tours.map((t, i) => `${i + 1}. "${t.title}" — ${t.activity_type}, ${t.duration_days} дн., ${t.base_price.toLocaleString('ru-RU')} руб/чел., ${t.location ?? 'Камчатка'}, сложность: ${t.difficulty_level ?? '?'}, оператор: ${t.operator_name}`).join('\n')}

Для каждого тура напиши короткое объяснение (1-2 предложения) почему он подходит. Формат ответа:
1: <объяснение>
2: <объяснение>
...`,
    },
  ];

  try {
    const result = await callAIFast(messages);
    if (!result) return;

    // Парсим ответ вида "1: объяснение\n2: объяснение"
    const lines = result.split('\n').filter(l => l.trim());
    for (const line of lines) {
      const match = line.match(/^(\d+)\s*[:.)]\s*(.+)$/);
      if (match) {
        const idx = parseInt(match[1]) - 1;
        const reasoning = match[2].trim();
        if (idx >= 0 && idx < tours.length && reasoning.length > 10) {
          tours[idx].reasoning = reasoning;
        }
      }
    }
  } catch {
    // AI недоступен — туры без reasoning, это не критично
  }
}

/**
 * Fire-and-forget: добавляет План Б (альтернативу на случай плохой погоды)
 * для каждого дня маршрута с погодозависимой активностью.
 */
async function addWeatherPlanB(
  itinerary: TripDay[],
  selected: TripTour[],
  totalDays: number,
  groupSize: number,
  budgetTotal: number,
): Promise<void> {
  // Петрозаводск-Камчатский координаты для прогноза (ближе к базе большинства туров)
  const lat = 53.0;
  const lng = 158.6;

  let forecast: Awaited<ReturnType<typeof fetchWeatherForecast>>;
  try {
    forecast = await fetchWeatherForecast(lat, lng, Math.min(totalDays, 16));
  } catch {
    return; // погода недоступна — без План Б, не критично
  }
  if (forecast.length === 0) return;

  // Для каждого дня с погодозависимой активностью — ищем альтернативу если плохая погода  
  for (const day of itinerary) {
    if (day.type !== 'tour' || !day.tour) continue;

    const activity = day.tour.activity_type ?? '';
    if (!WEATHER_SENSITIVE.has(activity)) continue;

    const dayIndex = day.day - 1;
    if (dayIndex < 0 || dayIndex >= forecast.length) continue;

    const weather = forecast[dayIndex];
    if (!BAD_WEATHER_CODES.has(weather.weatherCode)) continue;

    // Плохая погода — ищем План Б (внутренняя/погодонезависимая активность)
    try {
      const fallbacks = await pool.query<TourRow>(`
        SELECT t.id, t.title, t.activity_type,
               COALESCE(t.multi_day_count, CEIL(t.duration_hours / 24.0)::int, 1) AS duration_days,
               t.base_price,
               COALESCE(u.company_name, u.name) AS operator_name,
               t.location_name AS location, t.difficulty, t.tour_image
        FROM operator_tours t
        JOIN users u ON u.id = t.operator_id
        WHERE t.is_published = true AND t.is_active = true
          AND t.activity_type IN ('thermal', 'cultural')
          AND t.base_price <= $1
          AND t.id != $2
        ORDER BY t.base_price ASC
        LIMIT 1
      `, [Math.floor(budgetTotal / groupSize), day.tour.id]);

      if (fallbacks.rows.length > 0) {
        const row = fallbacks.rows[0];
        const dur = row.duration_days;
        day.planB = {
          id: row.id,
          title: row.title,
          activity_type: row.activity_type,
          duration_days: dur,
          base_price: row.base_price,
          operator_name: row.operator_name,
          location: row.location,
          difficulty_level: row.difficulty,
          tour_image: row.tour_image,
          booking_url: `/routes/${row.id}`,
        };
        const weatherDesc = WMO_DESCRIPTIONS[weather.weatherCode] ?? 'плохая погода';
        day.planBReason = `План Б: ${weatherDesc} — вместо ${activity} предлагаем ${row.activity_type}.`;
      }
    } catch {
      // не критично — день без План Б
    }
  }
}

const WMO_DESCRIPTIONS: Record<number, string> = {
  0: 'Ясно', 1: 'Малооблачно', 2: 'Переменная облачность', 3: 'Пасмурно',
  45: 'Туман', 48: 'Изморозь', 51: 'Морось', 53: 'Морось', 55: 'Сильная морось',
  61: 'Дождь', 63: 'Умеренный дождь', 65: 'Сильный дождь',
  71: 'Снег', 73: 'Умеренный снег', 75: 'Сильный снег', 77: 'Снежная крупа',
  80: 'Ливень', 81: 'Сильный ливень', 82: 'Шквал',
  85: 'Снегопад', 86: 'Сильный снегопад',
  95: 'Гроза', 96: 'Гроза с градом', 99: 'Сильная гроза с градом',
};
