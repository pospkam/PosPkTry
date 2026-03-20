/**
 * GET /api/octo/bookings/[uuid]
 * OCTO — get booking details by OCTO UUID
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOctoAuth } from '@/lib/octo/auth';
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
    return NextResponse.json(
      { error: 'NOT_FOUND', errorMessage: 'Booking not found' },
      { status: 404 }
    );
  }

  return NextResponse.json(mapBooking(booking));
}
