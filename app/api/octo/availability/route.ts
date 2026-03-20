/**
 * POST /api/octo/availability
 * OCTO — check availability for a product + option + date range
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOctoAuth } from '@/lib/octo/auth';
import { AvailabilityCheckSchema } from '@/lib/octo/schemas';
import { checkAvailability } from '@/lib/octo/service';
import { mapAvailability, mapFreesaleAvailability } from '@/lib/octo/mappers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authResult = await requireOctoAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  if (!authResult.canReadAvailability) {
    return NextResponse.json(
      { error: 'FORBIDDEN', errorMessage: 'API key lacks availability read permission' },
      { status: 403 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: 'BAD_REQUEST', errorMessage: 'Invalid JSON body' },
      { status: 400 }
    );
  }

  const parsed = AvailabilityCheckSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'BAD_REQUEST', errorMessage: parsed.error.issues.map(i => i.message).join(', ') },
      { status: 400 }
    );
  }

  const { productId, optionId, localDateStart, localDateEnd } = parsed.data;
  const result = await checkAvailability(productId, optionId, localDateStart, localDateEnd);

  if (result.mode === 'empty') {
    return NextResponse.json([]);
  }

  if (result.mode === 'calendar') {
    return NextResponse.json(
      result.slots.map((slot) =>
        mapAvailability(
          slot as unknown as Parameters<typeof mapAvailability>[0],
          productId,
          optionId
        )
      )
    );
  }

  // FREESALE — generate daily entries for the date range
  const dates: string[] = [];
  const start = new Date(localDateStart);
  const end = new Date(localDateEnd);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    dates.push(d.toISOString().slice(0, 10));
  }

  return NextResponse.json(
    dates.map(date => mapFreesaleAvailability(date, productId, optionId, result.basePrice))
  );
}
