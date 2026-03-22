/**
 * PATCH /api/octo/bookings/{uuid}/status
 *
 * Update booking status: CONFIRMED → REDEEMED (attended) or NO_SHOW
 * Required for completing booking lifecycle on OTA platforms.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireOctoAuth, octoError, applyOctoRateLimitHeaders } from '@/lib/octo/auth';
import { pool } from '@/lib/db-pool';
import { mapBooking } from '@/lib/octo/mappers';
import { notifyOctoWebhooks } from '@/lib/octo/webhooks';

// Status transition schema
const StatusTransitionSchema = z.object({
  status: z.enum(['REDEEMED', 'NO_SHOW']),
});

type StatusTransition = z.infer<typeof StatusTransitionSchema>;

export async function PATCH(
  request: NextRequest,
  context: { params: { uuid: string } }
) {
  try {
    // Authenticate OCTO request
    const authResult = await requireOctoAuth(request);
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { uuid } = context.params;

    // Validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      const err = octoError(400, 'BAD_REQUEST', 'Invalid JSON');
      return applyOctoRateLimitHeaders(err, authResult);
    }

    const parsed = StatusTransitionSchema.safeParse(body);
    if (!parsed.success) {
      const err = octoError(400, 'BAD_REQUEST', parsed.error.errors[0].message);
      return applyOctoRateLimitHeaders(err, authResult);
    }

    const { status } = parsed.data;

    // Map OCTO status to internal status
    const internalStatus = status === 'REDEEMED' ? 'completed' : 'no_show';
    const webhookEvent = status === 'REDEEMED' ? 'booking:redeemed' : 'booking:no_show';

    // Find booking by octo_uuid
    const bookingResult = await pool.query<any>(
      `SELECT * FROM operator_bookings
       WHERE octo_uuid = $1 AND deleted_at IS NULL`,
      [uuid]
    );

    if (bookingResult.rows.length === 0) {
      const err = octoError(404, 'NOT_FOUND', 'Booking not found');
      return applyOctoRateLimitHeaders(err, authResult);
    }

    const booking = bookingResult.rows[0];

    // Validate status transition: only CONFIRMED → REDEEMED or NO_SHOW
    if (booking.booking_status !== 'confirmed') {
      const err = octoError(
        422,
        'INVALID_STATE_TRANSITION',
        `Cannot transition from ${booking.booking_status} to ${status}. Only CONFIRMED bookings can be marked as REDEEMED or NO_SHOW.`
      );
      return applyOctoRateLimitHeaders(err, authResult);
    }

    // Update booking status
    const updateResult = await pool.query<any>(
      `UPDATE operator_bookings
       SET booking_status = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [internalStatus, booking.id]
    );

    const updatedBooking = updateResult.rows[0];

    // Log action
    await pool.query(
      `INSERT INTO octo_booking_log (booking_id, action, api_key_id, response_body)
       VALUES ($1, $2, $3, $4)`,
      [
        booking.id,
        `UPDATE_STATUS_${status}`,
        authResult.id,
        JSON.stringify({ status }),
      ]
    );

    // Send webhook notification
    const mappedBooking = mapBooking(updatedBooking);
    notifyOctoWebhooks(webhookEvent, booking.id, mappedBooking).catch(() => {});

    const response = NextResponse.json(mappedBooking, { status: 200 });
    return applyOctoRateLimitHeaders(response, authResult);
  } catch (error) {
    const authResult = await requireOctoAuth(request);
    const err = octoError(500, 'INTERNAL_ERROR', 'Internal server error');
    if (authResult instanceof NextResponse) {
      return err;
    }
    return applyOctoRateLimitHeaders(err, authResult);
  }
}
