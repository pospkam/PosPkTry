/**
 * TouristAgency — агент для туристов.
 *
 * Возможности:
 *   tourist_recommend — персональные рекомендации туров по интересам + датам
 *   tourist_plan_text — натуральный язык → заполненный план поездки
 */

import { parseInterestsFromText } from '@/lib/services/routes-recommender';
import { recommendTrip } from '@/lib/services/trip-recommender';
import type { AgentContext } from '../context-hub';

export interface AgencyResult {
  response: string;
  data?: Record<string, unknown>;
}

const NO_INTERESTS_RESPONSE =
  'Расскажи подробнее — что хочешь увидеть?\n' +
  'Вулканы, рыбалку, медведей, горячие источники, трекинг, гейзеры?';

export class TouristAgency {
  async run(
    intent: string,
    context: AgentContext,
    originalMessage: string
  ): Promise<AgencyResult> {
    switch (intent) {
      case 'tourist_recommend':  return this.getRecommendations(originalMessage, context);
      case 'tourist_plan_text':  return this.planFromText(originalMessage);
      default:                   return { response: 'TouristAgency: команда не поддерживается.' };
    }
  }

  async getRecommendations(
    message: string,
    _context: AgentContext
  ): Promise<AgencyResult> {
    const parsed = parseInterestsFromText(message);

    if (parsed.interests.length === 0) {
      return { response: NO_INTERESTS_RESPONSE };
    }

    const trip = await recommendTrip({
      interests: parsed.interests,
      arrivalDate:   parsed.dateFrom,
      departureDate: parsed.dateTo,
      adults: 2,
      children: [],
      fitnessLevel: 'moderate',
      budgetTier: 'comfort',
    });

    const topZones = trip.zones
      .slice(0, 2)
      .map(z => z.reason)
      .join(' ');

    const lines: string[] = [
      '<b>Рекомендации для тебя:</b>',
      '',
      `Интересы: ${parsed.interests.join(', ')}`,
    ];

    if (topZones) {
      lines.push(`Зоны: ${topZones}`);
    }

    if (trip.itinerary) {
      lines.push('', trip.itinerary.slice(0, 700));
    }

    if (trip.days.length > 0) {
      lines.push('', `Маршрут рассчитан на ${trip.days.length} дней.`);
    }

    if (trip.warnings.length > 0) {
      lines.push('', trip.warnings.map(w => w.message).join('\n'));
    }

    return {
      response: lines.join('\n'),
      data: { trip, interests: parsed.interests },
    };
  }

  /**
   * Парсит свободный текст → даты + интересы для TripBuilder.
   * Пример: "хочу вулканы и рыбалку, 7 дней в июне"
   */
  async planFromText(message: string): Promise<AgencyResult> {
    const parsed = parseInterestsFromText(message);

    if (parsed.interests.length === 0) {
      return { response: NO_INTERESTS_RESPONSE };
    }

    const PLANNER_PLACES    = ['volcano', 'hot_spring', 'geyser', 'sea', 'mountain', 'river'];
    const PLANNER_ACTIVITIES = ['trekking', 'fishing', 'helicopter', 'bears', 'snowmobile', 'boat_trip'];
    const RECOMMENDER_TO_PLACES: Record<string, string> = { thermal: 'hot_spring' };

    const places: string[] = [];
    const activities: string[] = [];

    for (const interest of parsed.interests) {
      const normalized = RECOMMENDER_TO_PLACES[interest] ?? interest;
      if (PLANNER_PLACES.includes(normalized))      places.push(normalized);
      else if (PLANNER_ACTIVITIES.includes(interest)) activities.push(interest);
    }

    const lines: string[] = ['Заполнил план по вашему описанию.'];
    if (places.length > 0)     lines.push(`Места: ${places.join(', ')}`);
    if (activities.length > 0) lines.push(`Активности: ${activities.join(', ')}`);
    if (parsed.dateFrom)       lines.push(`Прилёт: ${parsed.dateFrom}`);
    if (parsed.dateTo)         lines.push(`Отъезд: ${parsed.dateTo}`);

    return {
      response: lines.join('\n'),
      data: { places, activities, arrival: parsed.dateFrom ?? null, departure: parsed.dateTo ?? null },
    };
  }
}
