/**
 * POST /api/octo/availability/calendar
 * OCTO — one entry per day, optimised for calendar display over large date ranges
 * Returns: localDate, available, status, vacancies, capacity, openingHours
 * (no slot id, no utcCutoffAt — use POST /availability for booking-ready slots)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOctoAuth, applyOctoRateLimitHeaders } from '@/lib/octo/auth';
import { AvailabilityCheckSchema } from '@/lib/octo/schemas';
import { checkAvailability } from '@/lib/octo/service';
import { mapCalendarDay, mapFreesaleCalendarDay } from '@/lib/octo/mappers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authResult = await requireOctoAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  if (!authResult.canReadAvailability) {
    const response = NextResponse.json(
      { error: 'FORBIDDEN', errorMessage: 'API key lacks availability read permission' },
      { status: 403 }
    );
    return applyOctoRateLimitHeaders(response, authResult);
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    const response = NextResponse.json(
      { error: 'BAD_REQUEST', errorMessage: 'Invalid JSON body' },
      { status: 400 }
    );
    return applyOctoRateLimitHeaders(response, authResult);
  }

  const parsed = AvailabilityCheckSchema.safeParse(body);
  if (!parsed.success) {
    const response = NextResponse.json(
      { error: 'BAD_REQUEST', errorMessage: parsed.error.issues.map(i => i.message).join(', ') },
      { status: 400 }
    );
    return applyOctoRateLimitHeaders(response, authResult);
  }

  const { productId, optionId, localDateStart, localDateEnd } = parsed.data;
  const result = await checkAvailability(productId, optionId, localDateStart, localDateEnd);

  if (result.mode === 'empty') {
    const response = NextResponse.json([]);
    return applyOctoRateLimitHeaders(response, authResult);
  }

  if (result.mode === 'calendar') {
    const response = NextResponse.json(
      result.slots.map((slot) =>
        mapCalendarDay(
          slot as unknown as Parameters<typeof mapCalendarDay>[0],
          productId,
          optionId
        )
      )
    );
    return applyOctoRateLimitHeaders(response, authResult);
  }

  // FREESALE — generate one entry per day in the requested range
  const days: string[] = [];
  const start = new Date(localDateStart);
  const end = new Date(localDateEnd);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    days.push(d.toISOString().slice(0, 10));
  }

  const response = NextResponse.json(days.map(mapFreesaleCalendarDay));
  return applyOctoRateLimitHeaders(response, authResult);
}
