/**
 * POST /api/octo/availability
 * OCTO — check availability for a product + option + date range
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOctoAuth, applyOctoRateLimitHeaders } from '@/lib/octo/auth';
import { AvailabilityCheckSchema } from '@/lib/octo/schemas';
import { checkAvailability } from '@/lib/octo/service';
import { mapAvailability, mapFreesaleAvailability } from '@/lib/octo/mappers';
import { bulkDynamicPrices } from '@/lib/services/dynamic-pricing';

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
    const dates = result.slots.map(s => (s as { date: string }).date);
    const basePrice = Number((result.slots[0] as { base_price?: string | null })?.base_price ?? 0);
    const dynPrices: Record<string, { finalPrice: number }> = await bulkDynamicPrices(productId, dates, 1, basePrice).catch(() => ({}));

    const response = NextResponse.json(
      result.slots.map((slot) => {
        const date = (slot as { date: string }).date;
        const dp = dynPrices[date]?.finalPrice ?? null;
        return mapAvailability(
          slot as unknown as Parameters<typeof mapAvailability>[0],
          productId,
          optionId,
          dp
        );
      })
    );
    return applyOctoRateLimitHeaders(response, authResult);
  }

  // FREESALE — generate daily entries for the date range
  const dates: string[] = [];
  const start = new Date(localDateStart);
  const end   = new Date(localDateEnd);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }

  const basePrice = Number(result.basePrice ?? 0);
  const dynPrices: Record<string, { finalPrice: number }> = await bulkDynamicPrices(productId, dates, 1, basePrice).catch(() => ({}));

  const response = NextResponse.json(
    dates.map(date => {
      const dp = dynPrices[date]?.finalPrice ?? null;
      return mapFreesaleAvailability(date, productId, optionId, result.basePrice, dp);
    })
  );
  return applyOctoRateLimitHeaders(response, authResult);
}
