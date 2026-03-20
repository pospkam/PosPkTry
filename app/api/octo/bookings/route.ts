/**
 * POST /api/octo/bookings — create booking (ON_HOLD, 30 min hold)
 * GET  /api/octo/bookings — list not supported (use /bookings/[uuid])
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOctoAuth } from '@/lib/octo/auth';
import { BookingCreateSchema } from '@/lib/octo/schemas';
import { createBooking, getBookingByUuid } from '@/lib/octo/service';
import { mapBooking } from '@/lib/octo/mappers';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authResult = await requireOctoAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  if (!authResult.canCreateBookings) {
    return NextResponse.json(
      { error: 'FORBIDDEN', errorMessage: 'API key lacks booking creation permission' },
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

  const parsed = BookingCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'BAD_REQUEST', errorMessage: parsed.error.issues.map(i => i.message).join(', ') },
      { status: 400 }
    );
  }

  const { productId, optionId, availabilityId, unitItems, contact, notes } = parsed.data;

  // Parse date from availabilityId (format: productId-optionId-YYYY-MM-DD)
  const datePart = availabilityId.split('-').slice(-3).join('-');
  const adultCount = unitItems.filter(u => u.unitId === 'ADULT').length;
  const childCount = unitItems.filter(u => u.unitId === 'CHILD' || u.unitId === 'YOUTH').length;

  const result = await createBooking({
    tourId: productId,
    optionId,
    availabilityId,
    bookingDate: datePart,
    adultCount,
    childCount,
    contactName: contact?.fullName,
    contactEmail: contact?.emailAddress,
    contactPhone: contact?.phoneNumber,
    notes,
    apiKeyId: authResult.id,
  });

  if ('error' in result) {
    const status = result.error === 'PRODUCT_NOT_FOUND' || result.error === 'OPTION_NOT_FOUND' ? 404 : 400;
    return NextResponse.json(
      { error: result.error, errorMessage: `${result.error}` },
      { status }
    );
  }

  // Fetch full booking details for response
  const full = await getBookingByUuid(result.booking.octo_uuid);
  if (!full) {
    return NextResponse.json(
      { error: 'INTERNAL_ERROR', errorMessage: 'Booking created but failed to retrieve' },
      { status: 500 }
    );
  }

  return NextResponse.json(mapBooking(full), { status: 201 });
}
