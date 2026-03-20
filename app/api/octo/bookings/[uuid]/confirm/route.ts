/**
 * POST /api/octo/bookings/[uuid]/confirm
 * OCTO — confirm a held booking (ON_HOLD → CONFIRMED)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOctoAuth } from '@/lib/octo/auth';
import { confirmBooking, getBookingByUuid } from '@/lib/octo/service';
import { mapBooking } from '@/lib/octo/mappers';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  const authResult = await requireOctoAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  if (!authResult.canCreateBookings) {
    return NextResponse.json(
      { error: 'FORBIDDEN', errorMessage: 'API key lacks booking permission' },
      { status: 403 }
    );
  }

  const { uuid } = await params;
  const result = await confirmBooking(uuid, authResult.id);

  if (!result) {
    return NextResponse.json(
      { error: 'NOT_FOUND', errorMessage: 'Booking not found or not in ON_HOLD status' },
      { status: 404 }
    );
  }

  if (typeof result === 'object' && 'error' in result) {
    if (result.error === 'HOLD_EXPIRED') {
      return NextResponse.json(
        { error: 'GONE', errorMessage: 'Hold has expired. Create a new booking.' },
        { status: 410 }
      );
    }
    if (result.error === 'ALREADY_CONFIRMED') {
      // Idempotent: return current booking state
      const existing = await getBookingByUuid(uuid);
      if (existing) return NextResponse.json(mapBooking(existing));
      return NextResponse.json(
        { error: 'NOT_FOUND', errorMessage: 'Booking not found' },
        { status: 404 }
      );
    }
  }

  const full = await getBookingByUuid(uuid);
  if (!full) {
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', errorMessage: 'Confirmed but failed to retrieve booking' },
      { status: 500 }
    );
  }

  return NextResponse.json(mapBooking(full));
}
