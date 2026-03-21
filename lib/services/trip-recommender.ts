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
  flightArrivalTime?: string;   // "HH:MM"
  needsAirportTransfer?: boolean;
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

// Petropavlovsk-Kamchatsky airport area coords
const PKC_COORDS: [number, number] = [53.01, 158.65];

function generateDayPlans(
  zones: ZoneRecommendation[],
  interests: string[],
  tripDays: number,
  arrivalTime?: string,
  needsTransfer?: boolean,
): DayPlan[] {
  if (tripDays <= 0 || zones.length === 0) return [];

  // For trips >= 3 days: reserve Day 1 (arrival) and last day (departure)
  const hasBufferDays = tripDays >= 3;
  const activeDays = hasBufferDays ? tripDays - 2 : tripDays;
  const transferCost = needsTransfer ? 2500 : 0;

  const days: DayPlan[] = [];

  // Day 1 — arrival buffer (content depends on arrival time)
  if (hasBufferDays) {
    const lightInterest = interests.find(i => ['thermal', 'hot_spring', 'trekking', 'mountain'].includes(i)) ?? 'thermal';
    const [lightFrom, lightTo] = INTEREST_PRICE[lightInterest] ?? DEFAULT_PRICE;

    let day1Title: string;
    let day1PriceFrom: number;
    let day1PriceTo: number;

    if (arrivalTime) {
      const hour = parseInt(arrivalTime.split(':')[0], 10);
      if (hour < 12) {
        day1Title = 'Прилёт утром + размещение + вечер на термальных источниках';
        day1PriceFrom = Math.round(lightFrom * 0.8) + transferCost;
        day1PriceTo   = Math.round(lightTo   * 0.8) + transferCost;
      } else if (hour < 17) {
        day1Title = 'Прилёт днём + размещение + прогулка по городу';
        day1PriceFrom = Math.round(lightFrom * 0.5) + transferCost;
        day1PriceTo   = Math.round(lightTo   * 0.5) + transferCost;
      } else {
        day1Title = 'Прилёт вечером + размещение + ужин. Отдых с дороги';
        day1PriceFrom = transferCost;
        day1PriceTo   = 2000 + transferCost;
      }
    } else {
      day1Title    = 'Прилёт + размещение + знакомство с городом';
      day1PriceFrom = Math.round(lightFrom * 0.5) + transferCost;
      day1PriceTo   = Math.round(lightTo   * 0.5) + transferCost;
    }

    days.push({
      day: 1,
      zone: 'avachinsky',
      title: day1Title,
      activityType: lightInterest,
      priceFrom: day1PriceFrom,
      priceTo: day1PriceTo,
      coords: PKC_COORDS,
      defaultTransport: 'walking',
    });
  }

  // Distribute active days proportionally by zone score
  if (activeDays > 0) {
    const totalScore = zones.reduce((sum, z) => sum + z.score, 0) || 1;
    const zoneDays = zones.map(z => ({
      zone: z.zone,
      count: Math.max(0, Math.round((z.score / totalScore) * activeDays)),
    }));

    if (zoneDays[0]) zoneDays[0].count = Math.max(1, zoneDays[0].count);

    let total = zoneDays.reduce((s, z) => s + z.count, 0);
    while (total > activeDays && zoneDays.length > 1) { zoneDays[zoneDays.length - 1].count = Math.max(0, zoneDays[zoneDays.length - 1].count - 1); total--; }
    while (total < activeDays) { zoneDays[0].count++; total++; }

    let dayNum = hasBufferDays ? 2 : 1;

    for (const { zone, count } of zoneDays) {
      if (count <= 0) continue;

      const zoneInterests = ZONE_PRIMARY_INTERESTS[zone] ?? [];
      const matchingInterests = interests.filter(i => zoneInterests.includes(i));
      const activeInterest = matchingInterests[0] ?? interests[0] ?? 'trekking';

      const prices = matchingInterests
        .map(i => INTEREST_PRICE[i] ?? DEFAULT_PRICE)
        .sort(([a], [b]) => b - a);
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
  }

  // Last day — pack + transfer to airport + departure
  if (hasBufferDays) {
    days.push({
      day: tripDays,
      zone: 'avachinsky',
      title: 'Сборы + трансфер в аэропорт + вылет',
      activityType: 'thermal',
      priceFrom: transferCost,
      priceTo:   2000 + transferCost,
      coords: PKC_COORDS,
      defaultTransport: 'walking',
    });
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
  const days = generateDayPlans(zones, profile.interests, tripDays, profile.flightArrivalTime, profile.needsAirportTransfer);

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
    return `${tripDays}-дневный тур по ${mainZone}. День 1: прилёт, размещение, отдых. День 2: ${activities}. День ${tripDays}: трансфер в аэропорт, вылет.`;
  }
  if (tripDays <= 7) {
    const secondZone = zones[1] ? ZONE_NAMES[zones[1].zone] : 'соседняя зона';
    return `Недельный тур. День 1: прилёт, размещение. Дни 2–${tripDays - 3}: ${mainZone} (${activities}). День ${tripDays - 2}: переезд в ${secondZone}. Дни ${tripDays - 1}: активности. День ${tripDays}: сборы, вылет.`;
  }

  return `${tripDays}-дневный тур по Камчатке. День 1 — прилёт и акклиматизация. Дни 2–${tripDays - 1}: ${mainZone}, затем ${zones.slice(1).map(z => ZONE_NAMES[z.zone]).join(' и ')} — насыщенные активности. День ${tripDays}: ранние сборы и вылет.`;
}

function buildAIPrompt(
  profile: UserProfile,
  zones: ZoneRecommendation[],
  tripDays: number,
): string {
  const zoneList = zones.map(z => `- ${ZONE_NAMES[z.zone]} (${z.score}%)`).join('\n');
  const bufferNote = tripDays >= 3
    ? (() => {
        const timeCtx = profile.flightArrivalTime
          ? (() => {
              const h = parseInt(profile.flightArrivalTime!.split(':')[0], 10);
              return h < 12 ? `рейс в ${profile.flightArrivalTime} — успевает на лёгкую активность после обеда`
                : h < 17 ? `рейс в ${profile.flightArrivalTime} — небольшая прогулка вечером`
                : `рейс в ${profile.flightArrivalTime} — только ужин и отдых`;
            })()
          : 'время прилёта не указано';
        const transferCtx = profile.needsAirportTransfer
          ? '\n- Заказан трансфер от/до аэропорта (~2 500 ₽/сторона) — включи в описание дней прилёта и отъезда'
          : '';
        return `\n- День 1: прилёт в ПКЦ (${timeCtx}), размещение — никаких насыщенных активностей${transferCtx}\n- День ${tripDays}: сборы, трансфер в аэропорт, вылет — все активности завершаются накануне`;
      })()
    : '';
  return `Ты помощник туристического планирования на Камчатке.

Профиль туриста:
- Интересы: ${profile.interests.join(', ')}
- Дней: ${tripDays || 'не указано'}
- Даты: ${profile.arrivalDate || 'не указаны'}

Рекомендованные зоны:
${zoneList}${bufferNote}

Создай короткое (3–5 предложений) вдохновляющее описание маршрута с учётом буферных дней на прилёт и вылет. Укажи зоны, активности, почему это идеально для туриста и примерный график. Ответь на русском, единым текстом без нумерации.`;
}
