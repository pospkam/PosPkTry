/**
 * POST /api/planner/chat
 *
 * Natural-language → TripBuilder auto-fill.
 * Парсит текст пользователя → возвращает places, activities, arrival, departure.
 *
 * Пример: "хочу вулканы + рыбалку, 5 дней, в июне с гидом"
 * → places: ['volcano'], activities: ['fishing'], arrival: '2026-06-01', departure: '2026-06-06'
 *
 * Открытый маршрут — не требует авторизации.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { parseInterestsFromText } from '@/lib/services/routes-recommender';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  message: z.string().min(1).max(500),
});

// Константы совпадают с _PlannerClient.tsx
const PLANNER_PLACES    = ['volcano', 'hot_spring', 'geyser', 'sea', 'mountain', 'river'];
const PLANNER_ACTIVITIES = ['trekking', 'fishing', 'helicopter', 'bears', 'snowmobile', 'boat_trip'];

// Маппинг: типы из routes-recommender → planner places/activities
const RECOMMENDER_TO_PLACES: Record<string, string> = {
  thermal: 'hot_spring',
};

function parseDuration(text: string): number | null {
  const lower = text.toLowerCase();

  const dayMatch = lower.match(/(\d+)\s+дн(?:ей|я|ь)?/i)
    ?? lower.match(/(?:на|через)\s+(\d+)\s+дн/i);
  if (dayMatch) return parseInt(dayMatch[1], 10);

  if (/неделю|неделя/i.test(lower)) return 7;
  if (/две\s+недели/i.test(lower)) return 14;
  if (/месяц/i.test(lower)) return 14;

  return null;
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function defaultDates(durationDays: number): { arrival: string; departure: string } {
  // по умолчанию ставим на следующий месяц
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  const arrival   = d.toISOString().slice(0, 10);
  const departure = addDays(arrival, durationDays);
  return { arrival, departure };
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: 'Некорректный JSON' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Сообщение обязательно' }, { status: 400 });
  }

  const { message } = parsed.data;

  // 1. Парсим интересы + даты из текста
  const { interests, dateFrom, dateTo } = parseInterestsFromText(message);

  // 2. Разделяем на places и activities
  const places: string[]     = [];
  const activities: string[] = [];

  for (const interest of interests) {
    const normalized = RECOMMENDER_TO_PLACES[interest] ?? interest;
    if (PLANNER_PLACES.includes(normalized)) {
      places.push(normalized);
    } else if (PLANNER_ACTIVITIES.includes(normalized)) {
      activities.push(interest);
    }
  }

  // 3. Вычисляем финальные даты
  let arrival:   string | null = dateFrom ?? null;
  let departure: string | null = dateTo   ?? null;

  if (!arrival || !departure) {
    const duration = parseDuration(message);
    if (duration) {
      if (arrival) {
        departure = addDays(arrival, duration);
      } else {
        const d = defaultDates(duration);
        arrival   = d.arrival;
        departure = d.departure;
      }
    }
  }

  // 4. Формируем человекочитаемое резюме
  const parts: string[] = [];
  if (places.length > 0 || activities.length > 0) {
    const allLabels = [...places, ...activities].join(', ');
    parts.push(allLabels);
  }
  if (arrival && departure) {
    parts.push(`${arrival} — ${departure}`);
  }
  const interpreted = parts.length > 0 ? parts.join(' | ') : null;

  const hasEnoughData = (places.length > 0 || activities.length > 0);

  return NextResponse.json({
    success: true,
    places,
    activities,
    arrival,
    departure,
    interpreted,
    auto_recommend: hasEnoughData,
  });
}
