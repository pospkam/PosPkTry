/**
 * OCTO API — Service layer
 * SQL queries and transactions for OCTO endpoints.
 * Column names match actual DB schema (operator_tours, operator_bookings, tour_availability).
 */

import { pool } from '@/lib/db-pool';
import { notifyOctoWebhooks } from '@/lib/octo/webhooks';

/**
 * Check if a tour meets the "real tour" standard:
 * - Has partner (operator)
 * - Has filled calendar with available slots
 * - All required fields filled
 * - Has photos
 */
export async function isRealTour(tourId: string): Promise<boolean> {
  const { rows } = await pool.query<{
    has_operator: boolean;
    has_calendar: boolean;
    fields_complete: boolean;
    has_photo: boolean;
  }>(
    `SELECT
       (ot.operator_id IS NOT NULL) as has_operator,
       (ta.id IS NOT NULL) as has_calendar,
       (ot.title IS NOT NULL AND ot.description IS NOT NULL AND
        ot.base_price > 0 AND ot.location_type IS NOT NULL AND
        ot.activity_type IS NOT NULL AND ot.max_participants > 0) as fields_complete,
       (ot.hero_image IS NOT NULL OR ot.gallery IS NOT NULL) as has_photo
     FROM operator_tours ot
     LEFT JOIN tour_availability ta ON ta.operator_tour_id = ot.id
       AND ta.available_slots > 0 AND ta.is_cancelled = false AND ta.deleted_at IS NULL
     WHERE ot.id = $1 AND ot.is_published = true AND ot.deleted_at IS NULL
     LIMIT 1`,
    [tourId]
  );

  if (rows.length === 0) return false;

  const row = rows[0];
  return !!(row.has_operator && row.has_calendar && row.fields_complete && row.has_photo);
}

// --- Suppliers ---

export async function getSuppliers(operatorId?: string | null) {
  const params: unknown[] = [];
  let extra = '';
  if (operatorId) {
    params.push(operatorId);
    extra = `AND p.id = $${params.length}`;
  }

  const { rows } = await pool.query(
    `SELECT p.id, p.company_name AS name, p.slug, p.description, p.contacts
     FROM partners p
     WHERE p.is_public = true
       AND EXISTS (
         SELECT 1 FROM operator_tours ot
         WHERE ot.operator_id = p.id AND ot.is_published = true AND ot.deleted_at IS NULL
           AND ot.title IS NOT NULL AND ot.description IS NOT NULL
           AND ot.base_price > 0 AND ot.location_type IS NOT NULL
           AND ot.activity_type IS NOT NULL AND ot.max_participants > 0
           AND (ot.hero_image IS NOT NULL OR ot.gallery IS NOT NULL)
           AND EXISTS (
             SELECT 1 FROM tour_availability ta
             WHERE ta.operator_tour_id = ot.id
               AND ta.available_slots > 0
               AND ta.is_cancelled = false
               AND ta.deleted_at IS NULL
           )
       )
       ${extra}
     ORDER BY p.company_name`,
    params
  );
  return rows;
}

export async function getSupplierById(supplierId: string) {
  const { rows } = await pool.query(
    `SELECT p.id, p.company_name AS name, p.slug, p.description, p.contacts
     FROM partners p
     WHERE p.id = $1 AND p.is_public = true`,
    [supplierId]
  );
  return rows[0] ?? null;
}

// --- Products ---

export async function getProducts(operatorId?: string | null) {
  const params: unknown[] = [];
  let extra = '';
  if (operatorId) {
    params.push(operatorId);
    extra = `AND ot.operator_id = $${params.length}`;
  }

  const { rows } = await pool.query(
    `SELECT ot.id, ot.title, ot.description, ot.location_type, ot.activity_type,
            ot.base_price, ot.duration_hours, ot.season_start, ot.season_end,
            ot.latitude, ot.longitude, ot.max_participants,
            p.company_name AS partner_name, p.id AS partner_id
     FROM operator_tours ot
     LEFT JOIN partners p ON p.id = ot.operator_id
     WHERE ot.is_published = true AND ot.deleted_at IS NULL
       AND ot.operator_id IS NOT NULL
       AND ot.title IS NOT NULL AND ot.description IS NOT NULL
       AND ot.base_price > 0 AND ot.location_type IS NOT NULL
       AND ot.activity_type IS NOT NULL AND ot.max_participants > 0
       AND (ot.hero_image IS NOT NULL OR ot.gallery IS NOT NULL)
       AND EXISTS (
         SELECT 1 FROM tour_availability ta
         WHERE ta.operator_tour_id = ot.id
           AND ta.available_slots > 0
           AND ta.is_cancelled = false
           AND ta.deleted_at IS NULL
       )
       ${extra}
     ORDER BY ot.title`,
    params
  );
  return rows;
}

export async function getProductById(productId: string) {
  const { rows } = await pool.query(
    `SELECT ot.id, ot.title, ot.description, ot.location_type, ot.activity_type,
            ot.base_price, ot.duration_hours, ot.season_start, ot.season_end,
            ot.latitude, ot.longitude, ot.max_participants,
            p.company_name AS partner_name, p.id AS partner_id
     FROM operator_tours ot
     LEFT JOIN partners p ON p.id = ot.operator_id
     WHERE ot.id = $1 AND ot.is_published = true AND ot.deleted_at IS NULL
       AND ot.operator_id IS NOT NULL
       AND ot.title IS NOT NULL AND ot.description IS NOT NULL
       AND ot.base_price > 0 AND ot.location_type IS NOT NULL
       AND ot.activity_type IS NOT NULL AND ot.max_participants > 0
       AND (ot.hero_image IS NOT NULL OR ot.gallery IS NOT NULL)
       AND EXISTS (
         SELECT 1 FROM tour_availability ta
         WHERE ta.operator_tour_id = ot.id
           AND ta.available_slots > 0
           AND ta.is_cancelled = false
           AND ta.deleted_at IS NULL
       )`,
    [productId]
  );
  return rows[0] ?? null;
}

export async function getProductOptions(productId: string) {
  const { rows } = await pool.query(
    `SELECT id, internal_name, is_default, price_adult, price_child, price_youth,
            max_units, min_units, restrictions
     FROM tour_options
     WHERE operator_tour_id = $1 AND is_active = true
     ORDER BY is_default DESC, id`,
    [productId]
  );
  return rows;
}

// --- Availability ---

export async function checkAvailability(
  productId: string,
  optionId: string,
  dateStart: string,
  dateEnd: string
) {
  // Get explicit calendar slots
  const { rows: slots } = await pool.query(
    `SELECT ta.id, ta.date::text AS date, ta.available_slots, ta.booked_slots,
            ta.base_price_override, ot.base_price
     FROM tour_availability ta
     JOIN operator_tours ot ON ot.id = ta.operator_tour_id
     WHERE ta.operator_tour_id = $1
       AND ta.date BETWEEN $2 AND $3
       AND ta.is_cancelled = false
       AND (ta.deleted_at IS NULL)
     ORDER BY ta.date`,
    [productId, dateStart, dateEnd]
  );

  if (slots.length > 0) {
    return { mode: 'calendar' as const, slots };
  }

  // FREESALE: no calendar entries — return all dates in range as available
  const { rows: tourRows } = await pool.query(
    `SELECT base_price, season_start, season_end, max_participants, duration_hours
     FROM operator_tours
     WHERE id = $1 AND is_published = true AND deleted_at IS NULL`,
    [productId]
  );

  if (tourRows.length === 0) return { mode: 'empty' as const, slots: [] };

  const tour = tourRows[0];
  return {
    mode: 'freesale' as const,
    basePrice: tour.base_price,
    seasonStart: tour.season_start,
    seasonEnd: tour.season_end,
    maxParticipants: tour.max_participants,
    durationHours: tour.duration_hours,
  };
}

// --- Bookings ---

export async function createBooking(data: {
  tourId: string;
  optionId: string;
  availabilityId: string;
  bookingDate: string;
  adultCount: number;
  childCount: number;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  notes?: string;
  apiKeyId: string;
  resellerReference?: string;
}) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Idempotency: resellerReference (если передан) или availabilityId + apiKeyId
    const idempotencyQuery = data.resellerReference
      ? `SELECT octo_uuid FROM operator_bookings
         WHERE reseller_reference = $1 AND octo_api_key_id = $2 AND deleted_at IS NULL`
      : `SELECT octo_uuid FROM operator_bookings
         WHERE availability_id = $1 AND octo_api_key_id = $2 AND deleted_at IS NULL`;
    const idempotencyParam = data.resellerReference ?? data.availabilityId;
    const { rows: existing } = await client.query(idempotencyQuery, [idempotencyParam, data.apiKeyId]);
    if (existing.length > 0) {
      await client.query('ROLLBACK');
      const full = await getBookingByUuid(existing[0].octo_uuid);
      return { booking: full, idempotent: true };
    }

    // Check tour exists
    const { rows: tourRows } = await client.query(
      `SELECT id, base_price, title FROM operator_tours
       WHERE id = $1 AND is_published = true AND deleted_at IS NULL`,
      [data.tourId]
    );
    if (tourRows.length === 0) {
      await client.query('ROLLBACK');
      return { error: 'PRODUCT_NOT_FOUND' };
    }

    // Check option
    const { rows: optionRows } = await client.query(
      `SELECT id, price_adult, price_child FROM tour_options
       WHERE id = $1 AND operator_tour_id = $2 AND is_active = true`,
      [data.optionId, data.tourId]
    );
    if (optionRows.length === 0) {
      await client.query('ROLLBACK');
      return { error: 'OPTION_NOT_FOUND' };
    }

    const adultPrice = Number(optionRows[0].price_adult ?? tourRows[0].base_price);
    const childPrice = Number(optionRows[0].price_child ?? tourRows[0].base_price * 0.7);
    const totalPrice = adultPrice * data.adultCount + childPrice * data.childCount;
    const participants = data.adultCount + data.childCount;
    const holdExpiresAt = new Date(Date.now() + 30 * 60_000).toISOString();

    // Проверка слотов с блокировкой строки (FOR UPDATE SKIP LOCKED)
    const slotCheck = await client.query<{ id: string; available_slots: number; booked_slots: number }>(
      `SELECT id, available_slots, booked_slots
       FROM tour_availability
       WHERE operator_tour_id = $1 AND date = $2
       FOR UPDATE SKIP LOCKED`,
      [data.tourId, data.bookingDate]
    );
    if (slotCheck.rows.length > 0) {
      const slot = slotCheck.rows[0];
      const remaining = slot.available_slots - slot.booked_slots;
      if (remaining < participants) {
        await client.query('ROLLBACK');
        return { error: 'AVAILABILITY_SOLD_OUT' };
      }
    }

    // Increment booked_slots if calendar-based
    await client.query(
      `UPDATE tour_availability
       SET booked_slots = booked_slots + $3
       WHERE operator_tour_id = $1 AND date = $2`,
      [data.tourId, data.bookingDate, participants]
    );

    // Create booking
    const { rows: bookingRows } = await client.query(
      `INSERT INTO operator_bookings (
         operator_tour_id, booking_date, participants, adult_count, child_count,
         base_total_price, final_price, booking_status,
         tourist_name, tourist_email, tourist_phone, special_requests,
         octo_api_key_id, option_id, hold_expires_at, availability_id, reseller_reference, created_via
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'new', $8, $9, $10, $11, $12, $13, $14, $15, $16, 'api')
       RETURNING id, octo_uuid, booking_status, created_at`,
      [
        data.tourId, data.bookingDate, participants,
        data.adultCount, data.childCount,
        totalPrice, totalPrice,
        data.contactName ?? null, data.contactEmail ?? null,
        data.contactPhone ?? null, data.notes ?? null,
        data.apiKeyId, data.optionId, holdExpiresAt, data.availabilityId,
        data.resellerReference ?? null,
      ]
    );

    const booking = bookingRows[0];

    // Audit log
    await client.query(
      `INSERT INTO octo_booking_log (booking_id, action, api_key_id, request_body)
       VALUES ($1, 'CREATE', $2, $3)`,
      [booking.id, data.apiKeyId, JSON.stringify(data)]
    );

    await client.query('COMMIT');

    // Webhook notification (fire-and-forget)
    const fullBooking = await getBookingByUuid(booking.octo_uuid);
    notifyOctoWebhooks('booking:created', booking.id, fullBooking ?? {}).catch(() => {});

    return { booking };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function getBookingByUuid(octoUuid: string) {
  const { rows } = await pool.query(
    `SELECT ob.id, ob.octo_uuid, ob.booking_status, ob.booking_date::text AS booking_date,
            ob.participants, ob.adult_count, ob.child_count,
            ob.final_price, ob.currency, ob.tourist_name, ob.tourist_email,
            ob.tourist_phone, ob.special_requests, ob.hold_expires_at::text AS hold_expires_at,
            ob.availability_id,
            ob.created_at::text AS created_at, ob.updated_at::text AS updated_at,
            ob.option_id, ob.operator_tour_id,
            ot.title AS tour_title, ot.duration_hours,
            topt.internal_name AS option_name
     FROM operator_bookings ob
     JOIN operator_tours ot ON ot.id = ob.operator_tour_id
     LEFT JOIN tour_options topt ON topt.id = ob.option_id
     WHERE ob.octo_uuid = $1 AND ob.deleted_at IS NULL`,
    [octoUuid]
  );
  return rows[0] ?? null;
}

export async function confirmBooking(octoUuid: string, apiKeyId: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Only confirm if ON_HOLD (new) and hold not yet expired
    const { rows } = await client.query(
      `UPDATE operator_bookings
       SET booking_status = 'confirmed', hold_expires_at = NULL, updated_at = NOW()
       WHERE octo_uuid = $1 AND booking_status = 'new' AND deleted_at IS NULL
         AND (hold_expires_at IS NULL OR hold_expires_at > NOW())
       RETURNING id, octo_uuid`,
      [octoUuid]
    );

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      // Differentiate: expired hold vs not found vs already confirmed
      const { rows: check } = await client.query(
        `SELECT booking_status, hold_expires_at
         FROM operator_bookings
         WHERE octo_uuid = $1 AND deleted_at IS NULL`,
        [octoUuid]
      );
      if (check.length > 0 && check[0].booking_status === 'new') {
        return { error: 'HOLD_EXPIRED' as const };
      }
      if (check.length > 0 && check[0].booking_status === 'confirmed') {
        return { error: 'ALREADY_CONFIRMED' as const };
      }
      return null;
    }

    await client.query(
      `INSERT INTO octo_booking_log (booking_id, action, api_key_id)
       VALUES ($1, 'CONFIRM', $2)`,
      [rows[0].id, apiKeyId]
    );

    await client.query('COMMIT');

    const confirmed = rows[0];
    const fullBooking = await getBookingByUuid(octoUuid);
    notifyOctoWebhooks('booking:confirmed', confirmed.id, fullBooking ?? {}).catch(() => {});

    return confirmed;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

export async function cancelBooking(octoUuid: string, apiKeyId: string, reason?: string) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `UPDATE operator_bookings
       SET booking_status = 'cancelled', cancellation_reason = $2,
           cancelled_at = NOW(), updated_at = NOW()
       WHERE octo_uuid = $1 AND booking_status IN ('new', 'confirmed') AND deleted_at IS NULL
       RETURNING id, octo_uuid, operator_tour_id, booking_date, participants`,
      [octoUuid, reason ?? null]
    );

    if (rows.length === 0) {
      await client.query('ROLLBACK');
      return null;
    }

    const booking = rows[0];

    // Decrement booked_slots
    await client.query(
      `UPDATE tour_availability
       SET booked_slots = GREATEST(0, booked_slots - $3)
       WHERE operator_tour_id = $1 AND date = $2`,
      [booking.operator_tour_id, booking.booking_date, booking.participants]
    );

    await client.query(
      `INSERT INTO octo_booking_log (booking_id, action, api_key_id, request_body)
       VALUES ($1, 'CANCEL', $2, $3)`,
      [booking.id, apiKeyId, reason ? JSON.stringify({ reason }) : null]
    );

    await client.query('COMMIT');

    const fullBooking = await getBookingByUuid(octoUuid);
    notifyOctoWebhooks('booking:cancelled', booking.id, fullBooking ?? {}).catch(() => {});

    return booking;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
