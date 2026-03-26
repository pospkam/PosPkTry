/**
 * POST /api/planner/chat
 *
 * Natural-language -> TripBuilder auto-fill.
 * Uses LLM (callAIWaterfall) to parse free-form Russian text into structured
 * planner data. Falls back to keyword matching if LLM is unavailable.
 *
 * Response format (unchanged):
 *   { success, places[], activities[], arrival, departure, interpreted, auto_recommend }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { callAIWithModelDirect } from '@/lib/ai/providers';
import { getModelForAgent } from '@/lib/ai/agent-models';
import type { ChatMessage } from '@/lib/ai/prompts';
import { parseInterestsFromText } from '@/lib/services/routes-recommender';
import { recordTouristDemand } from '@/lib/ai/tourist-demand-aggregator';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const chatLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });

const BodySchema = z.object({
  message: z.string().min(1).max(500),
});

const PLANNER_PLACES    = ['volcano', 'hot_spring', 'geyser', 'sea', 'mountain', 'river'];
const PLANNER_ACTIVITIES = ['trekking', 'fishing', 'helicopter', 'bears', 'snowmobile', 'boat_trip', 'rafting'];

const RECOMMENDER_TO_PLACES: Record<string, string> = {
  thermal: 'hot_spring',
};

// Zod schema for validating AI response
const AIResponseSchema = z.object({
  places:        z.array(z.string()).default([]),
  activities:    z.array(z.string()).default([]),
  arrival:       z.string().nullable().default(null),
  departure:     z.string().nullable().default(null),
  duration_days: z.number().nullable().default(null),
});

const SYSTEM_PROMPT = `Ты -- парсер запросов для планировщика путешествий на Камчатку.
Из сообщения пользователя извлеки:
- places: массив из доступных мест [volcano, hot_spring, geyser, sea, mountain, river]
- activities: массив из доступных активностей [trekking, fishing, helicopter, bears, snowmobile, boat_trip]
- arrival: дата прилёта в формате YYYY-MM-DD или null если не указана
- departure: дата вылета в формате YYYY-MM-DD или null если не указана
- duration_days: число дней поездки или null если не указано

Правила:
- Извлекай только то, что явно или косвенно упомянуто. Не додумывай.
- "вулканы" = places: ["volcano"], "медведи" = activities: ["bears"]
- "термальные источники" = places: ["hot_spring"]
- "гейзеры" или "долина гейзеров" = places: ["geyser"], activities: ["helicopter"]
- "рыбалка" = activities: ["fishing"]
- "на неделю" = duration_days: 7
- Если год не указан, используй 2026.

Ответь СТРОГО валидным JSON без markdown-блока и пояснений:
{"places":[],"activities":[],"arrival":null,"departure":null,"duration_days":null}`;

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
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  d.setDate(1);
  const arrival   = d.toISOString().slice(0, 10);
  const departure = addDays(arrival, durationDays);
  return { arrival, departure };
}

/** Keyword-based fallback parsing */
function keywordParse(message: string) {
  const { interests, dateFrom, dateTo } = parseInterestsFromText(message);

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

  return { places, activities, arrival, departure };
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  if (!chatLimiter.check(ip)) {
    return NextResponse.json({ success: false, error: 'Слишком много запросов. Попробуйте через минуту.' }, { status: 429 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: 'Некорректный JSON' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Сообщение обязательно' }, { status: 400 });
  }

  const { message } = parsed.data;

  let places: string[] = [];
  let activities: string[] = [];
  let arrival: string | null = null;
  let departure: string | null = null;

  // 1. Try LLM parsing
  try {
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: message },
    ];

    const aiResponse = await callAIWithModelDirect(messages, getModelForAgent('planner'));

    // Extract JSON from response (handle potential wrapping)
    const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const aiParsed = AIResponseSchema.safeParse(JSON.parse(jsonMatch[0]));
      if (aiParsed.success) {
        const ai = aiParsed.data;

        // Filter to only valid values
        places = ai.places.filter(p => PLANNER_PLACES.includes(p));
        activities = ai.activities.filter(a => PLANNER_ACTIVITIES.includes(a));
        arrival = ai.arrival;
        departure = ai.departure;

        // If AI gave duration but not dates, compute them
        if ((!arrival || !departure) && ai.duration_days) {
          if (arrival) {
            departure = addDays(arrival, ai.duration_days);
          } else {
            const d = defaultDates(ai.duration_days);
            arrival = d.arrival;
            departure = d.departure;
          }
        }
      }
    }
  } catch {
    // AI failed — fall through to keyword fallback
  }

  // 2. Fallback to keyword parsing if AI yielded nothing
  if (places.length === 0 && activities.length === 0) {
    const fallback = keywordParse(message);
    places = fallback.places;
    activities = fallback.activities;
    if (!arrival) arrival = fallback.arrival;
    if (!departure) departure = fallback.departure;
  }

  // 3. Build human-readable summary
  const parts: string[] = [];
  if (places.length > 0 || activities.length > 0) {
    parts.push([...places, ...activities].join(', '));
  }
  if (arrival && departure) {
    parts.push(`${arrival} — ${departure}`);
  }
  const interpreted = parts.length > 0 ? parts.join(' | ') : null;

  const hasEnoughData = (places.length > 0 || activities.length > 0);

  // Bridge demand signal to agent system (fire-and-forget)
  if (hasEnoughData) {
    void recordTouristDemand({
      userId: null, // TripBuilder has no auth context
      activities,
      locations: places,
      travelStyle: null,
      budgetLevel: null,
      bookingIntentDetected: hasEnoughData && (!!arrival || !!departure),
      sessionId: null,
    });
  }

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
