/**
 * POST /api/planner/recommend
 * AI-powered trip recommendation based on user profile, group, and interests
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { recommendTrip } from '@/lib/services/trip-recommender';

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
  try {
    const body = await req.json();
    const parsed = RecommendSchema.parse(body);

    if (parsed.arrivalDate && parsed.departureDate && parsed.departureDate <= parsed.arrivalDate) {
      return NextResponse.json(
        { success: false, error: 'Дата отъезда должна быть позже даты прилёта' },
        { status: 400 },
      );
    }

    const recommendation = await recommendTrip(parsed);

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
