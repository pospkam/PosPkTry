/**
 * Planner Intelligence — external data + quality scoring + health assessment.
 * Weather forecast via Open-Meteo (free, no API key).
 */

import { SEA_ACTIVITIES, HARD_ACTIVITIES } from '@/lib/planner-constants';

// ── Weather Forecast ─────────────────────────────────────────────────────────

export interface DayForecast {
  date: string;
  tempMax: number;
  tempMin: number;
  precipMm: number;
  windKmh: number;
  weatherCode: number;
  description: string;
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

function wmoDescription(code: number): string {
  return WMO_DESCRIPTIONS[code] ?? (code <= 3 ? 'Ясно' : code <= 48 ? 'Облачно' : code <= 67 ? 'Дождь' : code <= 77 ? 'Снег' : 'Осадки');
}

// Module-level cache, 3h TTL
const forecastCache = new Map<string, { data: DayForecast[]; expiresAt: number }>();
const FORECAST_TTL = 3 * 60 * 60 * 1000;

/**
 * Fetch up to 16-day daily weather forecast from Open-Meteo.
 * Returns empty array on failure (graceful degradation).
 */
export async function fetchWeatherForecast(
  lat: number, lng: number, days: number
): Promise<DayForecast[]> {
  const cacheKey = `${lat.toFixed(2)},${lng.toFixed(2)},${days}`;
  const hit = forecastCache.get(cacheKey);
  if (hit && hit.expiresAt > Date.now()) return hit.data;

  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,weather_code&forecast_days=${Math.min(days, 16)}&timezone=Asia/Kamchatka`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return [];

    const json = await res.json() as {
      daily?: {
        time?: string[];
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        precipitation_sum?: number[];
        wind_speed_10m_max?: number[];
        weather_code?: number[];
      };
    };

    const d = json.daily;
    if (!d?.time) return [];

    const result: DayForecast[] = d.time.map((date, i) => ({
      date,
      tempMax: d.temperature_2m_max?.[i] ?? 0,
      tempMin: d.temperature_2m_min?.[i] ?? 0,
      precipMm: d.precipitation_sum?.[i] ?? 0,
      windKmh: d.wind_speed_10m_max?.[i] ?? 0,
      weatherCode: d.weather_code?.[i] ?? 0,
      description: wmoDescription(d.weather_code?.[i] ?? 0),
    }));

    forecastCache.set(cacheKey, { data: result, expiresAt: Date.now() + FORECAST_TTL });
    return result;
  } catch {
    return [];
  }
}

// ── Quality Score ────────────────────────────────────────────────────────────

/**
 * Compute 0-100 quality score from tour/operator signals.
 *
 * Weights: tourRating(35) + operatorRating(20) + reviewVolume(15)
 *          + verified(10) + recentPositive(10) + verifiedReviews(10)
 */
export function computeQualityScore(params: {
  tourRating: number | null;
  tourReviewCount: number;
  operatorRating: number;
  operatorReviewCount: number;
  operatorVerified: boolean;
  recentPositivePercent: number;
  verifiedReviewCount: number;
}): number {
  const tr = params.tourRating ?? params.operatorRating;
  const totalReviews = params.tourReviewCount + params.operatorReviewCount;

  let score = 0;
  score += (tr / 5) * 35;                                          // 0-35
  score += (params.operatorRating / 5) * 20;                       // 0-20
  score += Math.min(15, Math.log2(totalReviews + 1) * 3);          // 0-15
  score += params.operatorVerified ? 10 : 0;                       // 0-10
  score += (params.recentPositivePercent / 100) * 10;              // 0-10
  score += Math.min(10, params.verifiedReviewCount * 2);           // 0-10

  return Math.round(Math.min(100, Math.max(0, score)));
}

// ── Health Compatibility ─────────────────────────────────────────────────────

export interface HealthAssessment {
  compatible: boolean;
  warnings: string[];
  alternatives: string[];
}

const SEASICKNESS_KEYWORDS = ['укачива', 'морская болезнь', 'морск', 'seasick', 'тошнит на воде', 'кинетоз'];
const INJURY_KEYWORDS = ['колен', 'ног', 'спин', 'травм', 'перелом', 'knee', 'back', 'injur'];
const HEART_KEYWORDS = ['сердц', 'давлен', 'heart', 'гипертон', 'аритм', 'кардио'];

function matchesKeywords(text: string, keywords: string[]): boolean {
  const lower = text.toLowerCase();
  return keywords.some(kw => lower.includes(kw));
}

/**
 * Assess if an activity is compatible with tourist's health conditions.
 * Returns warnings (not blocks) — the tourist decides.
 */
export function assessHealthCompatibility(
  activityType: string,
  seasickness: boolean,
  healthNotes: string | undefined,
  mobilityLevel: 'full' | 'limited' | 'wheelchair' | undefined,
): HealthAssessment {
  const warnings: string[] = [];
  const alternatives: string[] = [];
  let compatible = true;

  // Seasickness check
  const hasSeasickness = seasickness || (healthNotes ? matchesKeywords(healthNotes, SEASICKNESS_KEYWORDS) : false);
  if (hasSeasickness && SEA_ACTIVITIES.has(activityType)) {
    warnings.push(`${activityType}: морская болезнь — морские экскурсии, рыбалка с катера и прибрежные туры могут вызвать дискомфорт. Рассмотрите террасные источники или треккинг.`);
    alternatives.push('hot_spring', 'trekking');
  }

  // Injury/mobility keywords
  if (healthNotes && matchesKeywords(healthNotes, INJURY_KEYWORDS) && HARD_ACTIVITIES.has(activityType)) {
    warnings.push(`${activityType}: при травмах опорно-двигательного аппарата сложные маршруты (5-10 часов ходьбы, набор высоты 800+ м) могут быть некомфортны. Рассмотрите облегчённые варианты.`);
    alternatives.push('hot_spring', 'helicopter');
  }

  // Heart/pressure keywords
  if (healthNotes && matchesKeywords(healthNotes, HEART_KEYWORDS) && HARD_ACTIVITIES.has(activityType)) {
    warnings.push(`${activityType}: при сердечно-сосудистых заболеваниях набор высоты может быть опасен. Обязательно проконсультируйтесь с врачом перед поездкой.`);
    compatible = false;
    alternatives.push('hot_spring', 'helicopter');
  }

  // Mobility level
  if (mobilityLevel === 'wheelchair') {
    if (activityType !== 'hot_spring' && activityType !== 'helicopter') {
      warnings.push(`${activityType}: безбарьерная инфраструктура на Камчатке крайне ограничена. Доступные варианты: термальные источники Паратунки (есть пандусы), обзорные вертолётные экскурсии.`);
      compatible = false;
      alternatives.push('hot_spring', 'helicopter');
    }
  } else if (mobilityLevel === 'limited') {
    if (HARD_ACTIVITIES.has(activityType)) {
      warnings.push(`${activityType}: ограниченная подвижность — выбраны облегчённые маршруты, исключены многочасовые переходы и крутые подъёмы.`);
      alternatives.push('hot_spring', 'bears');
    }
  }

  return { compatible, warnings, alternatives };
}
