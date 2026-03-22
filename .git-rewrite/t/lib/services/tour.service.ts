/**
 * Tour Service
 * Functions related to tour CRUD, search, publishing, and statistics.
 */

import {
  pool,
  toStringOrNull,
  toNumberOrNull,
  toBooleanOrNull,
  TourNotFoundError,
  TourValidationError,
  TourAlreadyPublishedError,
} from './_helpers';

export const tourService = {
  normalize(row: Record<string, unknown> | null) {
    if (!row) {
      return null;
    }

    const isActive = toBooleanOrNull(row.is_active ?? row.isActive) ?? false;
    return {
      id: row.id,
      name: toStringOrNull(row.name) ?? toStringOrNull(row.title) ?? '',
      title: toStringOrNull(row.name) ?? toStringOrNull(row.title) ?? '',
      description: toStringOrNull(row.description) ?? '',
      category: toStringOrNull(row.category) ?? null,
      difficulty: toStringOrNull(row.difficulty) ?? null,
      duration: toNumberOrNull(row.duration),
      price: toNumberOrNull(row.price ?? row.price_from),
      currency: toStringOrNull(row.currency) ?? 'RUB',
      operatorId: row.operator_id ?? row.operatorId ?? null,
      maxGroupSize: toNumberOrNull(row.max_group_size ?? row.maxGroupSize),
      minGroupSize: toNumberOrNull(row.min_group_size ?? row.minGroupSize),
      rating: toNumberOrNull(row.rating) ?? 0,
      reviewCount: toNumberOrNull(row.review_count ?? row.reviews_count) ?? 0,
      isActive,
      status: isActive ? 'published' : 'draft',
      createdAt: row.created_at ?? row.createdAt ?? null,
      updatedAt: row.updated_at ?? row.updatedAt ?? null,
      operatorName: toStringOrNull(row.operator_name),
    };
  },
  async search(params: Record<string, unknown>) {
    try {
      const limit = Math.min(toNumberOrNull(params.limit) ?? 20, 100);
      const offset = toNumberOrNull(params.offset) ?? 0;
      const query = toStringOrNull(params.query)?.trim();
      const sortBy = toStringOrNull(params.sortBy) ?? 'rating';
      const sortOrder = (toStringOrNull(params.sortOrder) ?? 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';
      const filters = params.filters && typeof params.filters === 'object'
        ? (params.filters as Record<string, unknown>)
        : {};

      const conditions: string[] = ['t.is_active = TRUE'];
      const queryParams: unknown[] = [];

      if (query) {
        conditions.push(`(t.name ILIKE $${queryParams.length + 1} OR t.description ILIKE $${queryParams.length + 1})`);
        queryParams.push(`%${query}%`);
      }

      const difficulty = toStringOrNull(filters.difficulty);
      if (difficulty) {
        conditions.push(`t.difficulty = $${queryParams.length + 1}`);
        queryParams.push(difficulty);
      }

      const activity = toStringOrNull(filters.activity);
      if (activity) {
        conditions.push(`t.category = $${queryParams.length + 1}`);
        queryParams.push(activity);
      }

      const minPrice = toNumberOrNull(filters.minPrice);
      if (minPrice !== null) {
        conditions.push(`t.price >= $${queryParams.length + 1}`);
        queryParams.push(minPrice);
      }

      const maxPrice = toNumberOrNull(filters.maxPrice);
      if (maxPrice !== null) {
        conditions.push(`t.price <= $${queryParams.length + 1}`);
        queryParams.push(maxPrice);
      }

      const minRating = toNumberOrNull(filters.rating);
      if (minRating !== null) {
        conditions.push(`COALESCE(t.rating, 0) >= $${queryParams.length + 1}`);
        queryParams.push(minRating);
      }

      const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const allowedSortFields: Record<string, string> = {
        rating: 't.rating',
        price: 't.price',
        created_at: 't.created_at',
        duration: 't.duration',
        name: 't.name',
      };
      const orderField = allowedSortFields[sortBy] ?? 't.rating';

      const count = await pool.query(
        `SELECT COUNT(*)::int AS total FROM tours t ${whereClause}`,
        queryParams
      );
      const total = Number(count.rows[0]?.total ?? 0);

      const result = await pool.query(
        `SELECT
           t.*,
           p.name AS operator_name
         FROM tours t
         LEFT JOIN partners p ON t.operator_id = p.id
         ${whereClause}
         ORDER BY ${orderField} ${sortOrder}
         LIMIT $${queryParams.length + 1}
         OFFSET $${queryParams.length + 2}`,
        [...queryParams, limit, offset]
      );

      return {
        tours: result.rows.map(row => this.normalize(row)),
        total,
        hasMore: offset + limit < total,
      };
    } catch {
      return { tours: [], total: 0, hasMore: false };
    }
  },
  async getById(id: string) {
    const result = await pool.query(
      `SELECT
         t.*,
         p.name AS operator_name
       FROM tours t
       LEFT JOIN partners p ON t.operator_id = p.id
       WHERE t.id = $1
       LIMIT 1`,
      [id]
    );
    if (!result.rows[0]) throw new TourNotFoundError(id);
    return this.normalize(result.rows[0] ?? null);
  },
  async read(id: string) {
    return this.getById(id);
  },
  async create(data: Record<string, unknown>) {
    const name = toStringOrNull(data.name) ?? toStringOrNull(data.title);
    const description = toStringOrNull(data.description);
    const operatorId = toStringOrNull(data.operatorId) ?? toStringOrNull(data.operator_id);
    const difficulty = toStringOrNull(data.difficulty) ?? 'medium';
    const duration = toNumberOrNull(data.duration) ?? 1;
    const price = toNumberOrNull(data.price) ?? toNumberOrNull(data.priceFrom) ?? toNumberOrNull(data.price_from);
    const category = toStringOrNull(data.category) ?? toStringOrNull(data.activity) ?? 'adventure';
    const currency = toStringOrNull(data.currency) ?? 'RUB';
    const maxGroupSize = toNumberOrNull(data.maxGroupSize) ?? toNumberOrNull(data.max_group_size) ?? 20;
    const minGroupSize = toNumberOrNull(data.minGroupSize) ?? toNumberOrNull(data.min_group_size) ?? 1;

    if (!name || !description || !operatorId || price === null) {
      throw new TourValidationError('Required fields: name, description, operatorId, price');
    }

    if (duration < 1 || duration > 30) {
      throw new TourValidationError('Duration must be between 1 and 30');
    }

    const validDifficulties = new Set(['easy', 'medium', 'hard', 'extreme']);
    if (!validDifficulties.has(difficulty)) {
      throw new TourValidationError('Invalid difficulty value');
    }

    const result = await pool.query(
      `INSERT INTO tours (
         name,
         description,
         category,
         difficulty,
         duration,
         price,
         currency,
         operator_id,
         max_group_size,
         min_group_size,
         is_active,
         created_at,
         updated_at
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, FALSE, NOW(), NOW())
       RETURNING *`,
      [name, description, category, difficulty, duration, price, currency, operatorId, maxGroupSize, minGroupSize]
    );
    return this.normalize(result.rows[0] ?? null);
  },
  async update(id: string, data: Record<string, unknown>) {
    const updates: string[] = [];
    const values: unknown[] = [];

    const name = toStringOrNull(data.name) ?? toStringOrNull(data.title);
    if (name) {
      updates.push(`name = $${values.length + 1}`);
      values.push(name);
    }

    const description = toStringOrNull(data.description);
    if (description !== null) {
      updates.push(`description = $${values.length + 1}`);
      values.push(description);
    }

    const category = toStringOrNull(data.category) ?? toStringOrNull(data.activity);
    if (category) {
      updates.push(`category = $${values.length + 1}`);
      values.push(category);
    }

    const difficulty = toStringOrNull(data.difficulty);
    if (difficulty) {
      updates.push(`difficulty = $${values.length + 1}`);
      values.push(difficulty);
    }

    const duration = toNumberOrNull(data.duration);
    if (duration !== null) {
      updates.push(`duration = $${values.length + 1}`);
      values.push(duration);
    }

    const price = toNumberOrNull(data.price) ?? toNumberOrNull(data.priceFrom) ?? toNumberOrNull(data.price_from);
    if (price !== null) {
      updates.push(`price = $${values.length + 1}`);
      values.push(price);
    }

    const currency = toStringOrNull(data.currency);
    if (currency) {
      updates.push(`currency = $${values.length + 1}`);
      values.push(currency);
    }

    const maxGroupSize = toNumberOrNull(data.maxGroupSize) ?? toNumberOrNull(data.max_group_size);
    if (maxGroupSize !== null) {
      updates.push(`max_group_size = $${values.length + 1}`);
      values.push(maxGroupSize);
    }

    const minGroupSize = toNumberOrNull(data.minGroupSize) ?? toNumberOrNull(data.min_group_size);
    if (minGroupSize !== null) {
      updates.push(`min_group_size = $${values.length + 1}`);
      values.push(minGroupSize);
    }

    const isActive = toBooleanOrNull(data.isActive ?? data.is_active);
    if (isActive !== null) {
      updates.push(`is_active = $${values.length + 1}`);
      values.push(isActive);
    }

    if (updates.length === 0) {
      throw new TourValidationError('No fields provided for update');
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE tours
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );
    if (!result.rows[0]) throw new TourNotFoundError(id);
    return this.normalize(result.rows[0] ?? null);
  },
  async publish(id: string) {
    const tour = await this.getById(id);
    if (tour?.isActive) throw new TourAlreadyPublishedError(id);
    const result = await pool.query(
      `UPDATE tours SET is_active = TRUE, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    return this.normalize(result.rows[0] ?? null);
  },
  async unpublish(id: string) {
    const tour = await this.getById(id);
    if (!tour) throw new TourNotFoundError(id);
    const result = await pool.query(
      `UPDATE tours SET is_active = FALSE, updated_at = NOW() WHERE id = $1 RETURNING *`,
      [id]
    );
    return this.normalize(result.rows[0] ?? null);
  },
  async getStats(id: string) {
    await this.getById(id);

    const bookingsStatsResult = await pool.query(
      `SELECT
         COUNT(*)::int AS total_bookings,
         COUNT(*) FILTER (WHERE status = 'confirmed')::int AS confirmed_bookings,
         COUNT(*) FILTER (WHERE status = 'completed')::int AS completed_bookings,
         COUNT(*) FILTER (WHERE status = 'cancelled')::int AS cancelled_bookings,
         COALESCE(SUM(total_price) FILTER (
           WHERE status IN ('confirmed', 'completed') AND payment_status = 'paid'
         ), 0) AS total_revenue,
         COALESCE(AVG(total_price) FILTER (
           WHERE status IN ('confirmed', 'completed')
         ), 0) AS average_booking_value
       FROM bookings
       WHERE tour_id = $1`,
      [id]
    );

    const reviewsStatsResult = await pool.query(
      `SELECT
         COUNT(*)::int AS total_reviews,
         COALESCE(AVG(rating), 0) AS average_rating,
         COUNT(*) FILTER (WHERE is_verified = TRUE)::int AS approved_reviews,
         COUNT(*) FILTER (WHERE is_verified = FALSE)::int AS pending_reviews
       FROM reviews
       WHERE tour_id = $1`,
      [id]
    );

    const bookingStats = bookingsStatsResult.rows[0] ?? {};
    const reviewStats = reviewsStatsResult.rows[0] ?? {};

    return {
      bookings: {
        total: Number(bookingStats.total_bookings ?? 0),
        confirmed: Number(bookingStats.confirmed_bookings ?? 0),
        completed: Number(bookingStats.completed_bookings ?? 0),
        cancelled: Number(bookingStats.cancelled_bookings ?? 0),
      },
      revenue: {
        total: Number(bookingStats.total_revenue ?? 0),
        averageBookingValue: Number(bookingStats.average_booking_value ?? 0),
      },
      reviews: {
        total: Number(reviewStats.total_reviews ?? 0),
        averageRating: Number(reviewStats.average_rating ?? 0),
        approved: Number(reviewStats.approved_reviews ?? 0),
        pending: Number(reviewStats.pending_reviews ?? 0),
      },
    };
  },
  async delete(id: string) {
    const result = await pool.query(`DELETE FROM tours WHERE id = $1 RETURNING id`, [id]);
    if (!result.rows[0]) {
      throw new TourNotFoundError(id);
    }
    return { success: true, id: result.rows[0].id };
  },
};
