/**
 * GET /api/octo/bookings/[uuid]
 * OCTO — get booking details by OCTO UUID
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOctoAuth, applyOctoRateLimitHeaders } from '@/lib/octo/auth';
import { getBookingByUuid } from '@/lib/octo/service';
import { mapBooking } from '@/lib/octo/mappers';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  const authResult = await requireOctoAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const { uuid } = await params;
  const booking = await getBookingByUuid(uuid);

  if (!booking) {
    const response = NextResponse.json(
      { error: 'NOT_FOUND', errorMessage: 'Booking not found' },
      { status: 404 }
    );
    return applyOctoRateLimitHeaders(response, authResult);
  }

  const response = NextResponse.json(mapBooking(booking));
  return applyOctoRateLimitHeaders(response, authResult);
}
