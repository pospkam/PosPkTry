/**
 * Booking & Availability Service
 * Functions related to booking CRUD, payment confirmation, cancellation, and availability.
 */

import {
  pool,
  toStringOrNull,
  toNumberOrNull,
} from './_helpers';

export const bookingService = {
  normalize(row: Record<string, unknown> | null) {
    if (!row) {
      return null;
    }

    const specialRequests = typeof row.special_requests === 'string'
      ? row.special_requests
      : typeof row.specialRequests === 'string'
        ? row.specialRequests
        : null;

    return {
      id: row.id,
      userId: row.user_id ?? row.userId ?? null,
      tourId: row.tour_id ?? row.tourId ?? null,
      startDate: row.start_date ?? row.startDate ?? row.date ?? null,
      guestsCount: row.guests_count ?? row.guestsCount ?? row.participants ?? null,
      totalPrice: row.total_price ?? row.totalPrice ?? null,
      status: row.status ?? null,
      paymentStatus: row.payment_status ?? row.paymentStatus ?? null,
      specialRequests,
      createdAt: row.created_at ?? row.createdAt ?? null,
      updatedAt: row.updated_at ?? row.updatedAt ?? null,
    };
  },
  async getById(id: string) {
    const result = await pool.query(`SELECT * FROM bookings WHERE id = $1`, [id]);
    return this.normalize(result.rows[0] ?? null);
  },
  async getByIdForUser(id: string, userId: string) {
    const result = await pool.query(
      `SELECT * FROM bookings WHERE id = $1 AND user_id = $2 LIMIT 1`,
      [id, userId]
    );
    return this.normalize(result.rows[0] ?? null);
  },
  async create(data: Record<string, unknown>) {
    const tourId = toStringOrNull(data.tourId) ?? toStringOrNull(data.tour_id);
    const userId = toStringOrNull(data.userId) ?? toStringOrNull(data.user_id);
    const totalPrice = toNumberOrNull(data.totalPrice) ?? toNumberOrNull(data.finalPrice) ?? toNumberOrNull(data.total_price);
    const startDate = toStringOrNull(data.startDate) ?? toStringOrNull(data.date) ?? new Date().toISOString().slice(0, 10);
    const participants = toNumberOrNull(data.participants) ?? toNumberOrNull(data.guestsCount) ?? toNumberOrNull(data.guests_count) ?? 1;
    const specialRequests = toStringOrNull(data.specialRequests) ?? toStringOrNull(data.special_requests);

    if (!tourId || !userId || totalPrice === null) {
      throw new Error('Required fields: tourId, userId, totalPrice');
    }

    const result = await pool.query(
      `INSERT INTO bookings (
         user_id,
         tour_id,
         date,
         start_date,
         participants,
         guests_count,
         total_price,
         status,
         payment_status,
         special_requests,
         created_at,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', 'pending', $8, NOW(), NOW())
       RETURNING *`,
      [userId, tourId, startDate, startDate, participants, participants, totalPrice, specialRequests]
    );
    return this.normalize(result.rows[0] ?? null);
  },
  async update(id: string, data: Record<string, unknown>) {
    const specialRequests = typeof data.specialRequests === 'string'
      ? data.specialRequests
      : typeof data.special_requests === 'string'
        ? data.special_requests
        : null;

    const result = await pool.query(
      `UPDATE bookings
       SET
         status = COALESCE($2, status),
         special_requests = COALESCE($3, special_requests),
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, data.status ?? null, specialRequests]
    );
    return this.normalize(result.rows[0] ?? null);
  },
  async updateForUser(id: string, userId: string, data: Record<string, unknown>) {
    const specialRequests = typeof data.specialRequests === 'string'
      ? data.specialRequests
      : typeof data.special_requests === 'string'
        ? data.special_requests
        : null;

    const result = await pool.query(
      `UPDATE bookings
       SET
         status = COALESCE($3, status),
         special_requests = COALESCE($4, special_requests),
         updated_at = NOW()
       WHERE id = $1 AND user_id = $2
       RETURNING *`,
      [id, userId, data.status ?? null, specialRequests]
    );
    return this.normalize(result.rows[0] ?? null);
  },
  async confirmPayment(bookingId: string, _transactionId: string) {
    const result = await pool.query(
      `UPDATE bookings
       SET
         status = 'confirmed',
         payment_status = 'paid',
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [bookingId]
    );
    return this.normalize(result.rows[0] ?? null);
  },
  async cancel(id: string, reason: string, userId?: string) {
    const result = userId
      ? await pool.query(
          `UPDATE bookings
           SET
             status = 'cancelled',
             updated_at = NOW(),
             special_requests = CASE
               WHEN $3::text = '' THEN special_requests
               WHEN special_requests IS NULL OR special_requests = '' THEN $3
               ELSE special_requests || E'\n' || $3
             END
           WHERE id = $1 AND user_id = $2
           RETURNING *`,
          [id, userId, reason]
        )
      : await pool.query(
          `UPDATE bookings
           SET
             status = 'cancelled',
             updated_at = NOW(),
             special_requests = CASE
               WHEN $2::text = '' THEN special_requests
               WHEN special_requests IS NULL OR special_requests = '' THEN $2
               ELSE special_requests || E'\n' || $2
             END
           WHERE id = $1
           RETURNING *`,
          [id, reason]
        );

    const booking = this.normalize(result.rows[0] ?? null);
    if (!booking) {
      return null;
    }

    return {
      ...booking,
      refundAmount: 0,
    };
  },
  async list(params: Record<string, unknown>) {
    const limit = (params.limit as number) || 20;
    const offset = (params.offset as number) || 0;
    const result = await pool.query(
      `SELECT * FROM bookings ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
      [limit, offset]
    );
    return { bookings: result.rows.map(row => this.normalize(row)) };
  },
};

// ========================================
// Availability Service
// ========================================

export const availabilityService = {
  async search(params: Record<string, unknown>) {
    return [];
  },
  async getByTour(tourId: string) {
    return { availability: [] };
  },
  async createSlot(data: Record<string, unknown>) {
    return {
      id: crypto.randomUUID(),
      ...data,
      createdAt: new Date().toISOString(),
    };
  },
  async getCalendar(tourId: string, startDate: Date, endDate: Date) {
    return {
      tourId,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      days: [],
    };
  },
  async update(id: string, data: Record<string, unknown>) {
    return { success: true };
  },
};
