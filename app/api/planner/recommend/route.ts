/**
 * POST /api/planner/recommend
 * AI-powered trip recommendation based on user profile, group, and interests.
 * Optionally loads saved preferences from AgentMemory for authenticated users.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { recommendTrip } from '@/lib/services/trip-recommender';
import { verifyAuth } from '@/lib/auth';
import { agentMemory } from '@/lib/agents/memory/agent-memory';

interface SavedPrefs {
  interests?: string[];
  fitnessLevel?: string;
  budgetTier?: string;
  adults?: number;
}

const RecommendSchema = z.object({
  interests: z.array(z.string()).min(1).max(12),
  arrivalDate: z.string().date().optional(),
  departureDate: z.string().date().optional(),
  flightArrivalTime: z.string().max(5).optional(),
  flightDepartureTime: z.string().max(5).optional(),
  adults: z.number().int().min(1).max(20).default(2),
  children: z.array(z.number().int().min(0).max(17)).max(10).default([]),
  fitnessLevel: z.enum(['beginner', 'moderate', 'active']).default('moderate'),
  budgetTier: z.enum(['economy', 'comfort', 'premium']).default('comfort'),
  seasickness: z.boolean().default(false),
  riskMode: z.enum(['safe_only', 'adventure', 'available']).default('safe_only'),
});

export async function POST(req: NextRequest) {
  // Optional auth — recommendation works without login
  let userId: string | null = null;
  try {
    const auth = await verifyAuth(req);
    userId = auth.userId ?? null;
  } catch {
    // Non-blocking — continue without auth
  }

  try {
    const rawBody = await req.json() as unknown;

    // If authenticated, merge saved preferences (request body wins)
    let mergedBody: unknown = rawBody;
    if (userId) {
      try {
        const entry = await agentMemory.get('tourist-agency', 'user_preference', `user_${userId}_prefs`);
        if (entry) {
          const saved = entry.value as SavedPrefs;
          const bodyObj = rawBody as Record<string, unknown>;
          mergedBody = {
            interests:    bodyObj.interests    ?? saved.interests,
            fitnessLevel: bodyObj.fitnessLevel ?? saved.fitnessLevel,
            budgetTier:   bodyObj.budgetTier   ?? saved.budgetTier,
            adults:       bodyObj.adults       ?? saved.adults,
            ...bodyObj,
          };
        }
      } catch {
        // Non-critical — proceed with original body
      }
    }

    const parsed = RecommendSchema.parse(mergedBody);

    if (parsed.arrivalDate && parsed.departureDate && parsed.departureDate <= parsed.arrivalDate) {
      return NextResponse.json(
        { success: false, error: 'Дата отъезда должна быть позже даты прилёта' },
        { status: 400 },
      );
    }

    const recommendation = await recommendTrip(parsed);

    // Fire-and-forget: persist preferences for authenticated users
    if (userId) {
      agentMemory.remember({
        agent_id:    'tourist-agency',
        memory_type: 'user_preference',
        key:         `user_${userId}_prefs`,
        value: {
          interests:    parsed.interests,
          fitnessLevel: parsed.fitnessLevel,
          budgetTier:   parsed.budgetTier,
          adults:       parsed.adults,
          savedAt:      new Date().toISOString(),
        },
        confidence: 1.0,
        source:     'recommend_request',
      }).catch(() => {});
    }

    return NextResponse.json({ success: true, data: recommendation });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Некорректные параметры', details: err.errors },
        { status: 400 },
      );
    }
    const msg = err instanceof Error ? err.message : 'Ошибка при генерации рекомендации';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
