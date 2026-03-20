/**
 * TripPlanner AI Recommender
 * Analyzes user interests + dates → recommends optimal zones + day plans
 */

import { callAIWaterfall } from '@/lib/ai/providers';
import type { ChatMessage } from '@/lib/ai/prompts';

interface UserProfile {
  interests: string[];
  arrivalDate?: string;
  departureDate?: string;
}

interface ZoneRecommendation {
  zone: 'avachinsky' | 'western' | 'eastern' | 'northern';
  score: number; // 0-100
  reason: string;
  bestMonths: number[];
}

export type TransportType = 'walking' | 'jeep' | 'helicopter' | 'boat';

export interface DayPlan {
  day: number;
  zone: 'avachinsky' | 'western' | 'eastern' | 'northern';
  title: string;
  activityType: string;
  priceFrom: number;
  priceTo: number;
  coords: [number, number];
  defaultTransport: TransportType;
}

interface TripRecommendation {
  zones: ZoneRecommendation[];
  days: DayPlan[];
  itinerary: string;
  warning?: string;
}

const INTEREST_TO_ZONES: Record<string, string[]> = {
  volcano:    ['avachinsky', 'northern'],
  fishing:    ['western', 'avachinsky'],
  bears:      ['eastern', 'northern'],
  helicopter: ['avachinsky', 'northern'],
  thermal:    ['eastern', 'northern', 'avachinsky'],
  trekking:   ['avachinsky', 'eastern', 'northern'],
  snowmobile: ['avachinsky', 'northern', 'western'],
  sea:        ['eastern', 'western', 'avachinsky'],
  hot_spring: ['avachinsky', 'eastern'],
  geyser:     ['northern', 'eastern'],
  mountain:   ['avachinsky', 'northern'],
  river:      ['western', 'avachinsky'],
  boat_trip:  ['western', 'eastern'],
};

const ZONE_NAMES: Record<string, string> = {
  avachinsky: 'Авачинская зона (вулканы, парк)',
  western:    'Западная зона (рыбалка, реки)',
  eastern:    'Восточная зона (медведи, заповедник)',
  northern:   'Северная зона (гейзеры, дикая природа)',
};

const ZONE_BEST_MONTHS: Record<string, number[]> = {
  avachinsky: [6, 7, 8, 9],
  western:    [5, 6, 7, 8, 9],
  eastern:    [7, 8, 9],
  northern:   [6, 7, 8, 9],
};

export const ZONE_COORDS: Record<string, [number, number]> = {
  avachinsky: [53.25, 158.75],
  eastern:    [54.80, 160.50],
  northern:   [56.50, 160.00],
  western:    [52.50, 156.50],
};

const ZONE_DAY_TITLES: Record<string, string[]> = {
  avachinsky: [
    'Вулкан Авачинский', 'Долина Налычево', 'Термальные источники Паратунки',
    'Мутновский вулкан', 'Вилючинский водопад',
  ],
  eastern: [
    'Долина реки Жупанова', 'Наблюдение за медведями', 'Кроноцкий заповедник',
    'Бухта Ольга', 'Река Козыревка',
  ],
  northern: [
    'Долина гейзеров', 'Кальдера Узон', 'Перевал Кроноцкий',
    'Вулкан Шивелуч', 'Озеро Курильское',
  ],
  western: [
    'Рыбалка на реке Быстрой', 'Мыс Лопатка', 'Морская прогулка',
    'Устье реки Камчатки', 'Охотское побережье',
  ],
};

const ZONE_PRIMARY_INTERESTS: Record<string, string[]> = {
  avachinsky: ['volcano', 'trekking', 'helicopter', 'thermal', 'hot_spring', 'mountain'],
  eastern:    ['bears', 'thermal', 'fishing', 'sea', 'trekking'],
  northern:   ['geyser', 'bears', 'helicopter', 'trekking', 'snowmobile'],
  western:    ['fishing', 'boat_trip', 'sea', 'snowmobile', 'river'],
};

const INTEREST_PRICE: Record<string, [number, number]> = {
  trekking:   [3000,  8000],
  fishing:    [8000,  20000],
  bears:      [15000, 35000],
  helicopter: [25000, 60000],
  thermal:    [2000,  6000],
  hot_spring: [2000,  5000],
  boat_trip:  [5000,  15000],
  snowmobile: [8000,  18000],
  volcano:    [5000,  12000],
  geyser:     [8000,  20000],
  mountain:   [3000,  9000],
  sea:        [4000,  12000],
  river:      [5000,  15000],
};

const DEFAULT_PRICE: [number, number] = [3000, 10000];

const ACTIVITY_DEFAULT_TRANSPORT: Record<string, TransportType> = {
  trekking:   'walking',
  fishing:    'boat',
  bears:      'helicopter',
  helicopter: 'helicopter',
  thermal:    'walking',
  hot_spring: 'walking',
  boat_trip:  'boat',
  snowmobile: 'jeep',
  volcano:    'jeep',
  geyser:     'helicopter',
  mountain:   'walking',
  sea:        'boat',
  river:      'boat',
};

function generateDayPlans(
  zones: ZoneRecommendation[],
  interests: string[],
  tripDays: number,
): DayPlan[] {
  if (tripDays <= 0 || zones.length === 0) return [];

  // Distribute days proportionally by zone score
  const totalScore = zones.reduce((sum, z) => sum + z.score, 0) || 1;
  const zoneDays = zones.map(z => ({
    zone: z.zone,
    count: Math.max(0, Math.round((z.score / totalScore) * tripDays)),
  }));

  // Ensure top zone gets at least 1 day
  if (zoneDays[0]) zoneDays[0].count = Math.max(1, zoneDays[0].count);

  // Adjust total to match tripDays
  let total = zoneDays.reduce((s, z) => s + z.count, 0);
  while (total > tripDays && zoneDays.length > 1) { zoneDays[zoneDays.length - 1].count = Math.max(0, zoneDays[zoneDays.length - 1].count - 1); total--; }
  while (total < tripDays) { zoneDays[0].count++; total++; }

  const days: DayPlan[] = [];
  let dayNum = 1;

  for (const { zone, count } of zoneDays) {
    if (count <= 0) continue;

    const zoneInterests = ZONE_PRIMARY_INTERESTS[zone] ?? [];
    const matchingInterests = interests.filter(i => zoneInterests.includes(i));
    const activeInterest = matchingInterests[0] ?? interests[0] ?? 'trekking';

    // Pick best price range from matching zone interests
    const prices = matchingInterests
      .map(i => INTEREST_PRICE[i] ?? DEFAULT_PRICE)
      .sort(([a], [b]) => b - a); // sort descending by priceFrom
    const [priceFrom, priceTo] = prices[0] ?? DEFAULT_PRICE;

    const titles = ZONE_DAY_TITLES[zone] ?? [`День в зоне ${zone}`];

    for (let d = 0; d < count; d++) {
      days.push({
        day: dayNum++,
        zone: zone as DayPlan['zone'],
        title: titles[d % titles.length],
        activityType: activeInterest,
        priceFrom,
        priceTo,
        coords: ZONE_COORDS[zone] as [number, number],
        defaultTransport: ACTIVITY_DEFAULT_TRANSPORT[activeInterest] ?? 'walking',
      });
    }
  }

  return days;
}

export async function recommendTrip(profile: UserProfile): Promise<TripRecommendation> {
  if (!profile.interests || profile.interests.length === 0) {
    return {
      zones: [],
      days: [],
      itinerary: 'Пожалуйста, выберите ваши интересы',
      warning: 'Нужны интересы для рекомендации',
    };
  }

  // Map interests to zones
  const zoneScores: Record<string, number> = {};
  profile.interests.forEach(interest => {
    const zones = INTEREST_TO_ZONES[interest] || [];
    zones.forEach(zone => {
      zoneScores[zone] = (zoneScores[zone] || 0) + 25;
    });
  });

  // Check seasonality
  const month = profile.arrivalDate
    ? new Date(profile.arrivalDate).getMonth() + 1
    : new Date().getMonth() + 1;

  let warning: string | undefined;
  const unseasonalZones = Object.entries(ZONE_BEST_MONTHS)
    .filter(([, months]) => !months.includes(month))
    .map(([zone]) => zone);

  if (unseasonalZones.length > 0 && unseasonalZones.length <= 2) {
    warning = `В выбранный период для ${unseasonalZones.map(z => ZONE_NAMES[z]).join(', ')} не сезон`;
  }

  // Penalize off-season zones
  unseasonalZones.forEach(zone => {
    zoneScores[zone] = Math.max(0, (zoneScores[zone] || 0) - 15);
  });

  // Calculate trip days
  let tripDays = 0;
  if (profile.arrivalDate && profile.departureDate) {
    const diff = new Date(profile.departureDate).getTime() - new Date(profile.arrivalDate).getTime();
    tripDays = Math.round(diff / 86400000);
  }

  // Build zone recommendations
  const zones: ZoneRecommendation[] = Object.entries(zoneScores)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([zone, score]) => ({
      zone: zone as ZoneRecommendation['zone'],
      score: Math.min(100, score),
      reason: `Отлично подходит для: ${profile.interests.filter(i => INTEREST_TO_ZONES[i]?.includes(zone)).join(', ')}`,
      bestMonths: ZONE_BEST_MONTHS[zone] || [],
    }));

  // Generate structured day plans
  const days = generateDayPlans(zones, profile.interests, tripDays);

  // Use AI to generate itinerary text
  let itinerary = generateBasicItinerary(zones, tripDays, profile.interests);

  try {
    const aiPrompt = buildAIPrompt(profile, zones, tripDays);
    const messages: ChatMessage[] = [
      { role: 'system', content: 'Вы ассистент по туристическому планированию Камчатки.' },
      { role: 'user', content: aiPrompt },
    ];
    const aiResponse = await callAIWaterfall(messages);
    if (aiResponse && aiResponse.trim()) itinerary = aiResponse;
  } catch {
    // AI unavailable — fallback itinerary already set
  }

  return { zones, days, itinerary, warning };
}

function generateBasicItinerary(
  zones: ZoneRecommendation[],
  tripDays: number,
  interests: string[],
): string {
  if (zones.length === 0) return 'Нет рекомендаций. Пожалуйста, выберите интересы и даты.';

  const mainZone = ZONE_NAMES[zones[0].zone];
  const activities = interests.join(', ');

  if (tripDays <= 1) {
    return `Однодневный тур — ${mainZone}. Выезд рано утром, день насыщен активностями (${activities}), возврат к вечеру.`;
  }
  if (tripDays <= 3) {
    return `${tripDays}-дневный тур по ${mainZone}. День 1: прибытие, первые активности. Дни 2–${tripDays - 1}: ${activities}. День ${tripDays}: отъезд.`;
  }
  if (tripDays <= 7) {
    const secondZone = zones[1] ? ZONE_NAMES[zones[1].zone] : 'соседняя зона';
    return `Недельный тур. Дни 1–3: ${mainZone} (${activities}). День 4: переезд. Дни 5–${tripDays - 1}: ${secondZone}. День ${tripDays}: отъезд.`;
  }

  return `${tripDays}-дневный тур по Камчатке. Начинаем с ${mainZone}, затем охватываем ${zones.slice(1).map(z => ZONE_NAMES[z.zone]).join(' и ')}. Достаточно времени для глубокого погружения в природу.`;
}

function buildAIPrompt(
  profile: UserProfile,
  zones: ZoneRecommendation[],
  tripDays: number,
): string {
  const zoneList = zones.map(z => `- ${ZONE_NAMES[z.zone]} (${z.score}%)`).join('\n');
  return `Ты помощник туристического планирования на Камчатке.

Профиль туриста:
- Интересы: ${profile.interests.join(', ')}
- Дней: ${tripDays || 'не указано'}
- Даты: ${profile.arrivalDate || 'не указаны'}

Рекомендованные зоны:
${zoneList}

Создай короткое (3–5 предложений) вдохновляющее описание маршрута. Укажи зоны, активности, почему это идеально для туриста и примерный график. Ответь на русском, единым текстом без нумерации.`;
}
