/**
 * POST /api/planner/recommend
 * AI-powered trip recommendation based on user interests and dates
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { recommendTrip } from '@/lib/services/trip-recommender';

const RecommendSchema = z.object({
  interests: z.array(z.string()).min(1).max(8),
  arrivalDate: z.string().date().optional(),
  departureDate: z.string().date().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { interests, arrivalDate, departureDate } = RecommendSchema.parse(body);

    if (arrivalDate && departureDate && departureDate <= arrivalDate) {
      return NextResponse.json(
        { success: false, error: 'Дата отъезда должна быть позже даты прилёта' },
        { status: 400 }
      );
    }

    const recommendation = await recommendTrip({ interests, arrivalDate, departureDate });

    return NextResponse.json({ success: true, data: recommendation });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Некорректные параметры', details: err.errors },
        { status: 400 }
      );
    }
    const msg = err instanceof Error ? err.message : 'Ошибка при генерации рекомендации';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
