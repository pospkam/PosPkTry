/**
 * POST /api/octo/bookings/[uuid]/cancel
 * OCTO — cancel a booking (ON_HOLD or CONFIRMED → CANCELLED)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOctoAuth, applyOctoRateLimitHeaders } from '@/lib/octo/auth';
import { BookingCancelSchema } from '@/lib/octo/schemas';
import { cancelBooking, getBookingByUuid } from '@/lib/octo/service';
import { mapBooking } from '@/lib/octo/mappers';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  const authResult = await requireOctoAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  if (!authResult.canCreateBookings) {
    const response = NextResponse.json(
      { error: 'FORBIDDEN', errorMessage: 'API key lacks booking permission' },
      { status: 403 }
    );
    return applyOctoRateLimitHeaders(response, authResult);
  }

  let body: unknown = {};
  try {
    body = await request.json();
  } catch {
    // Body is optional for cancel
  }

  const parsed = BookingCancelSchema.safeParse(body);
  const reason = parsed.success ? parsed.data.reason : undefined;

  const { uuid } = await params;
  const result = await cancelBooking(uuid, authResult.id, reason);

  if (!result) {
    const response = NextResponse.json(
      { error: 'NOT_FOUND', errorMessage: 'Booking not found or already cancelled/completed' },
      { status: 404 }
    );
    return applyOctoRateLimitHeaders(response, authResult);
  }

  const full = await getBookingByUuid(uuid);
  if (!full) {
    const response = NextResponse.json(
      { error: 'INTERNAL_ERROR', errorMessage: 'Cancelled but failed to retrieve booking' },
      { status: 500 }
    );
    return applyOctoRateLimitHeaders(response, authResult);
  }

  const response = NextResponse.json(mapBooking(full));
  return applyOctoRateLimitHeaders(response, authResult);
}
