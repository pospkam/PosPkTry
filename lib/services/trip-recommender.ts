/**
 * TripPlanner AI Recommender
 * Analyzes user interests + dates → recommends optimal zones + routes
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

interface TripRecommendation {
  zones: ZoneRecommendation[];
  itinerary: string; // AI-generated day-by-day plan
  warning?: string; // seasonality warning
}

const INTEREST_TO_ZONES: Record<string, string[]> = {
  volcano: ['avachinsky', 'northern'],
  fishing: ['western', 'avachinsky'],
  bears: ['eastern', 'northern'],
  helicopter: ['avachinsky', 'northern'],
  thermal: ['eastern', 'northern', 'avachinsky'],
  trekking: ['avachinsky', 'eastern', 'northern'],
  snowmobile: ['avachinsky', 'northern', 'western'],
  sea: ['eastern', 'western', 'avachinsky'],
};

const ZONE_NAMES: Record<string, string> = {
  avachinsky: 'Авачинская зона (вулканы, парк)',
  western: 'Западная зона (рыбалка, реки)',
  eastern: 'Восточная зона (медведи, заповедник)',
  northern: 'Северная зона (гейзеры, дикая природа)',
};

const ZONE_BEST_MONTHS: Record<string, number[]> = {
  avachinsky: [6, 7, 8, 9],
  western: [5, 6, 7, 8, 9],
  eastern: [7, 8, 9],
  northern: [6, 7, 8, 9],
};

export async function recommendTrip(profile: UserProfile): Promise<TripRecommendation> {
  if (!profile.interests || profile.interests.length === 0) {
    return {
      zones: [],
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
    .filter(([_, months]) => !months.includes(month))
    .map(([zone]) => zone);

  if (unseasonalZones.length > 0 && unseasonalZones.length <= 2) {
    warning = `🌡️ В выбранный период для ${unseasonalZones.map(z => ZONE_NAMES[z]).join(', ')} не сезон`;
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
      zone: zone as any,
      score: Math.min(100, score),
      reason: `Отлично подходит для: ${profile.interests.map(i => INTEREST_TO_ZONES[i]?.includes(zone) ? i : null).filter(Boolean).join(', ')}`,
      bestMonths: ZONE_BEST_MONTHS[zone] || [],
    }));

  // Use AI to generate itinerary
  let itinerary = generateBasicItinerary(zones, tripDays, profile.interests);

  try {
    const aiPrompt = buildAIPrompt(profile, zones, tripDays);
    const messages: ChatMessage[] = [
      { role: 'system', content: 'Вы ассистент по туристическому планированию Камчатки.' },
      { role: 'user', content: aiPrompt },
    ];
    const aiResponse = await callAIWaterfall(messages);

    if (aiResponse && aiResponse.trim()) {
      itinerary = aiResponse;
    }
  } catch (err) {
    console.warn('AI recommendation failed, using fallback:', err);
  }

  return {
    zones,
    itinerary,
    warning,
  };
}

function generateBasicItinerary(
  zones: ZoneRecommendation[],
  tripDays: number,
  interests: string[]
): string {
  if (zones.length === 0) {
    return 'Нет рекомендаций. Пожалуйста, выберите интересы и даты.';
  }

  const mainZone = ZONE_NAMES[zones[0].zone];
  const activities = interests.join(', ');

  if (tripDays <= 1) {
    return `## Однодневный тур\n\n**Зона:** ${mainZone}\n\n**Программа:**\n- Выезд рано утром\n- ${activities}\n- Возврат к вечеру`;
  }

  if (tripDays <= 3) {
    return `## ${tripDays}-дневный тур\n\n**Основная зона:** ${mainZone}\n\n**День 1:** Прилёт, первые активности\n**День 2-${tripDays - 1}:** ${activities}\n**День ${tripDays}:** Чек-аут, отъезд`;
  }

  if (tripDays <= 7) {
    const secondZone = zones[1] ? ZONE_NAMES[zones[1].zone] : 'соседняя зона';
    return `## Недельный тур\n\n**Основная зона:** ${mainZone}\n**Вторая зона:** ${secondZone}\n\n**Дни 1-3:** Основная зона (${activities})\n**День 4:** Переезд между зонами\n**Дни 5-${tripDays - 1}:** Вторая зона\n**День ${tripDays}:** Отъезд`;
  }

  return `## ${tripDays}-дневный тур по Камчатке\n\n**Основная туристическая зона:** ${mainZone}\n\nУ вас достаточно времени для полного погружения в природу Камчатки. Рекомендуем посетить несколько зон для максимального разнообразия впечатлений.`;
}

function buildAIPrompt(
  profile: UserProfile,
  zones: ZoneRecommendation[],
  tripDays: number
): string {
  const zoneList = zones.map(z => `- ${ZONE_NAMES[z.zone]} (релевантность ${z.score}%)`).join('\n');

  return `Ты помощник туристического планирования на Камчатке.

Профиль туриста:
- Интересы: ${profile.interests.join(', ')}
- Дни путешествия: ${tripDays || 'не указано'}
- Даты: ${profile.arrivalDate || 'не указаны'}

Рекомендованные зоны:
${zoneList}

Создай короткое (3-5 предложений), вдохновляющее описание оптимального маршрута для этого туриста. Укажи:
1. Какую зону посетить (или зоны если 5+ дней)
2. Основные активности
3. Почему это идеально для его интересов
4. Примерный график

Ответь на русском, без пунктуации-нумерации, как единый вдохновляющий текст.`;
}
