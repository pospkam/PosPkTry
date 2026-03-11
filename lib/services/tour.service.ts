import { pool } from '@/lib/db-pool';
import { toStringOrNull, toNumberOrNull, toBooleanOrNull } from './_helpers';
import {
  TourNotFoundError,
  TourValidationError,
  TourAlreadyPublishedError,
  ReviewNotFoundError,
  ReviewValidationError,
  DuplicateReviewError,
} from './_errors';

export {
  TourNotFoundError,
  TourValidationError,
  TourAlreadyPublishedError,
  ReviewNotFoundError,
  ReviewValidationError,
  DuplicateReviewError,
};

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

export const reviewService = {
  normalize(row: Record<string, unknown> | null) {
    if (!row) {
      return null;
    }

    const isVerified = toBooleanOrNull(row.is_verified ?? row.isVerified) ?? false;
    return {
      id: row.id,
      userId: row.user_id ?? row.userId ?? null,
      user_id: row.user_id ?? row.userId ?? null,
      tourId: row.tour_id ?? row.tourId ?? null,
      tour_id: row.tour_id ?? row.tourId ?? null,
      rating: toNumberOrNull(row.rating) ?? 0,
      comment: toStringOrNull(row.comment) ?? '',
      isVerified,
      is_verified: isVerified,
      status: isVerified ? 'approved' : 'pending',
      operatorReply: toStringOrNull(row.operator_reply ?? row.operatorReply),
      operator_reply: toStringOrNull(row.operator_reply ?? row.operatorReply),
      operatorReplyAt: row.operator_reply_at ?? row.operatorReplyAt ?? null,
      operator_reply_at: row.operator_reply_at ?? row.operatorReplyAt ?? null,
      createdAt: row.created_at ?? row.createdAt ?? null,
      updatedAt: row.updated_at ?? row.updatedAt ?? null,
      userName: toStringOrNull(row.user_name),
      userEmail: toStringOrNull(row.user_email),
      tourName: toStringOrNull(row.tour_name),
    };
  },
  async create(data: Record<string, unknown>) {
    const tourId = toStringOrNull(data.tourId) ?? toStringOrNull(data.tour_id);
    const userId = toStringOrNull(data.userId) ?? toStringOrNull(data.user_id);
    const rating = toNumberOrNull(data.rating);
    const comment = toStringOrNull(data.comment) ?? '';

    if (!tourId || !userId || rating === null) {
      throw new ReviewValidationError('Required fields: tourId, userId, rating');
    }
    if (rating < 1 || rating > 5) {
      throw new ReviewValidationError('Rating must be between 1 and 5');
    }

    const duplicateCheck = await pool.query(
      `SELECT id FROM reviews WHERE tour_id = $1 AND user_id = $2 LIMIT 1`,
      [tourId, userId]
    );
    if (duplicateCheck.rows.length > 0) {
      throw new DuplicateReviewError('Review for this tour already exists');
    }

    const result = await pool.query(
      `INSERT INTO reviews (tour_id, user_id, rating, comment, is_verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, FALSE, NOW(), NOW())
       RETURNING *`,
      [tourId, userId, rating, comment]
    );
    return this.normalize(result.rows[0] ?? null);
  },
  async getById(id: string) {
    const result = await pool.query(
      `SELECT
         r.*,
         u.name AS user_name,
         u.email AS user_email,
         t.name AS tour_name
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN tours t ON r.tour_id = t.id
       WHERE r.id = $1
       LIMIT 1`,
      [id]
    );
    if (!result.rows[0]) throw new ReviewNotFoundError(id);
    return this.normalize(result.rows[0] ?? null);
  },
  async read(id: string) {
    return this.getById(id);
  },
  async search(params: Record<string, unknown>) {
    const filters = params.filters && typeof params.filters === 'object'
      ? (params.filters as Record<string, unknown>)
      : {};
    const limit = Math.min(toNumberOrNull(params.limit) ?? 20, 100);
    const offset = toNumberOrNull(params.offset) ?? 0;
    const sortBy = toStringOrNull(params.sortBy) ?? 'newest';

    const whereConditions: string[] = [];
    const queryParams: unknown[] = [];

    const tourId = toStringOrNull(filters.tourId);
    if (tourId) {
      whereConditions.push(`r.tour_id = $${queryParams.length + 1}`);
      queryParams.push(tourId);
    }

    const status = toStringOrNull(filters.status);
    if (status === 'approved') {
      whereConditions.push(`r.is_verified = TRUE`);
    } else if (status === 'pending' || status === 'rejected') {
      whereConditions.push(`r.is_verified = FALSE`);
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const allowedSort: Record<string, string> = {
      newest: 'r.created_at DESC',
      oldest: 'r.created_at ASC',
      rating_desc: 'r.rating DESC',
      rating_asc: 'r.rating ASC',
    };
    const orderBy = allowedSort[sortBy] ?? allowedSort.newest;

    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM reviews r ${whereClause}`,
      queryParams
    );
    const total = Number(countResult.rows[0]?.total ?? 0);

    const result = await pool.query(
      `SELECT
         r.*,
         u.name AS user_name,
         u.email AS user_email,
         t.name AS tour_name
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN tours t ON r.tour_id = t.id
       ${whereClause}
       ORDER BY ${orderBy}
       LIMIT $${queryParams.length + 1}
       OFFSET $${queryParams.length + 2}`,
      [...queryParams, limit, offset]
    );

    return {
      reviews: result.rows.map(row => this.normalize(row)),
      total,
      hasMore: offset + limit < total,
    };
  },
  async list(params: Record<string, unknown>) {
    return this.search(params);
  },
  async update(id: string, data: Record<string, unknown>) {
    const updates: string[] = [];
    const values: unknown[] = [];

    const rating = toNumberOrNull(data.rating);
    if (rating !== null) {
      if (rating < 1 || rating > 5) {
        throw new ReviewValidationError('Rating must be between 1 and 5');
      }
      updates.push(`rating = $${values.length + 1}`);
      values.push(rating);
      updates.push(`is_verified = FALSE`);
    }

    const comment = toStringOrNull(data.comment);
    if (comment !== null) {
      updates.push(`comment = $${values.length + 1}`);
      values.push(comment);
      updates.push(`is_verified = FALSE`);
    }

    const status = toStringOrNull(data.status);
    if (status === 'approved') {
      updates.push(`is_verified = TRUE`);
    } else if (status === 'pending' || status === 'rejected') {
      updates.push(`is_verified = FALSE`);
    }

    if (updates.length === 0) {
      throw new ReviewValidationError('No fields provided for update');
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE reviews
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );
    if (!result.rows[0]) throw new ReviewNotFoundError(id);
    return this.normalize(result.rows[0] ?? null);
  },
  async delete(id: string) {
    const result = await pool.query(`DELETE FROM reviews WHERE id = $1 RETURNING id`, [id]);
    if (!result.rows[0]) throw new ReviewNotFoundError(id);
    return { success: true, id: result.rows[0].id };
  },
  async approve(id: string, adminUserId: string) {
    const adminResult = await pool.query(
      `SELECT role FROM users WHERE id = $1 LIMIT 1`,
      [adminUserId]
    );
    if (!adminResult.rows[0] || adminResult.rows[0].role !== 'admin') {
      throw new ReviewValidationError('Only admin can approve reviews');
    }

    const result = await pool.query(
      `UPDATE reviews
       SET is_verified = TRUE, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    if (!result.rows[0]) throw new ReviewNotFoundError(id);
    return this.normalize(result.rows[0] ?? null);
  },
  async reject(id: string, adminUserId: string, reason: string) {
    const adminResult = await pool.query(
      `SELECT role FROM users WHERE id = $1 LIMIT 1`,
      [adminUserId]
    );
    if (!adminResult.rows[0] || adminResult.rows[0].role !== 'admin') {
      throw new ReviewValidationError('Only admin can reject reviews');
    }

    const result = await pool.query(
      `UPDATE reviews
       SET is_verified = FALSE, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id]
    );
    if (!result.rows[0]) throw new ReviewNotFoundError(id);

    return {
      ...this.normalize(result.rows[0] ?? null),
      rejectionReason: reason,
    };
  },
  async respondToReview(id: string, operatorUserId: string, responseText: string) {
    if (!responseText.trim()) {
      throw new ReviewValidationError('Response text is required');
    }

    const review = await this.getById(id);
    const reviewTourId = toStringOrNull(review?.tourId);
    if (!reviewTourId) {
      throw new ReviewNotFoundError(id);
    }

    const userResult = await pool.query(
      `SELECT role FROM users WHERE id = $1 LIMIT 1`,
      [operatorUserId]
    );
    const role = toStringOrNull(userResult.rows[0]?.role);
    if (!role) {
      return null;
    }

    if (role !== 'admin') {
      const ownershipResult = await pool.query(
        `SELECT 1
         FROM tours t
         JOIN partners p ON t.operator_id = p.id
         WHERE t.id = $1 AND p.user_id = $2
         LIMIT 1`,
        [reviewTourId, operatorUserId]
      );
      if (ownershipResult.rows.length === 0) {
        return null;
      }
    }

    const result = await pool.query(
      `UPDATE reviews
       SET
         operator_reply = $2,
         operator_reply_at = NOW(),
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, responseText.trim()]
    );
    if (!result.rows[0]) throw new ReviewNotFoundError(id);
    return this.normalize(result.rows[0] ?? null);
  },
  async getStats(tourId: string) {
    const result = await pool.query(
      `SELECT
         COUNT(*)::int AS total_reviews,
         COALESCE(AVG(rating), 0) AS average_rating,
         COUNT(*) FILTER (WHERE is_verified = TRUE)::int AS approved_reviews,
         COUNT(*) FILTER (WHERE is_verified = FALSE)::int AS pending_reviews
       FROM reviews
       WHERE tour_id = $1`,
      [tourId]
    );
    const stats = result.rows[0] ?? {};
    return {
      total: Number(stats.total_reviews ?? 0),
      averageRating: Number(stats.average_rating ?? 0),
      approved: Number(stats.approved_reviews ?? 0),
      pending: Number(stats.pending_reviews ?? 0),
    };
  },
};

export const searchService = {
  async search(queryOrParams: unknown, maybeParams?: Record<string, unknown>) {
    const params = typeof queryOrParams === 'string'
      ? { ...(maybeParams ?? {}), query: queryOrParams }
      : ((queryOrParams && typeof queryOrParams === 'object')
        ? (queryOrParams as Record<string, unknown>)
        : {});

    const result = await tourService.search(params);
    return {
      tours: result.tours,
      total: result.total,
      hasMore: result.hasMore,
      query: toStringOrNull(params.query) ?? '',
    };
  },
  async advancedSearch(params: Record<string, unknown>) {
    const startedAt = Date.now();
    const result = await this.search(params);
    const filters = params.filters && typeof params.filters === 'object'
      ? (params.filters as Record<string, unknown>)
      : {};

    return {
      tours: result.tours,
      total: result.total,
      hasMore: result.hasMore,
      facets: {
        activities: filters.activity ? [filters.activity] : [],
        difficulties: filters.difficulty ? [filters.difficulty] : [],
      },
      executionTime: Date.now() - startedAt,
    };
  },
  async autocomplete(query: string, limit = 10) {
    if (!query.trim()) return [];
    const result = await pool.query(
      `SELECT DISTINCT name
       FROM tours
       WHERE is_active = TRUE AND name ILIKE $1
       ORDER BY name ASC
       LIMIT $2`,
      [`%${query.trim()}%`, Math.min(Math.max(limit, 1), 50)]
    );
    return result.rows
      .map(row => toStringOrNull(row.name))
      .filter((value): value is string => Boolean(value));
  },
  async getRecommended(limit = 10, operatorId?: string) {
    const params: unknown[] = [];
    const conditions: string[] = ['is_active = TRUE'];

    if (operatorId) {
      conditions.push(`operator_id = $${params.length + 1}`);
      params.push(operatorId);
    }

    params.push(Math.min(Math.max(limit, 1), 50));
    const result = await pool.query(
      `SELECT *
       FROM tours
       WHERE ${conditions.join(' AND ')}
       ORDER BY COALESCE(rating, 0) DESC, created_at DESC
       LIMIT $${params.length}`,
      params
    );
    return result.rows.map(row => tourService.normalize(row));
  },
  async getTrending(limit = 10) {
    const result = await pool.query(
      `SELECT *
       FROM tours
       WHERE is_active = TRUE
       ORDER BY COALESCE(review_count, 0) DESC, COALESCE(rating, 0) DESC
       LIMIT $1`,
      [Math.min(Math.max(limit, 1), 50)]
    );
    return result.rows.map(row => tourService.normalize(row));
  },
  async getPopularTags(limit = 20) {
    const result = await pool.query(
      `SELECT category, COUNT(*)::int AS cnt
       FROM tours
       WHERE is_active = TRUE AND category IS NOT NULL
       GROUP BY category
       ORDER BY cnt DESC
       LIMIT $1`,
      [Math.min(Math.max(limit, 1), 100)]
    );
    return result.rows.map(row => ({
      tag: toStringOrNull(row.category) ?? 'other',
      count: Number(row.cnt ?? 0),
    }));
  },
  async getSimilar(tourId: string, limit = 5) {
    const sourceTour = await pool.query(
      `SELECT id, category, difficulty FROM tours WHERE id = $1 LIMIT 1`,
      [tourId]
    );
    const base = sourceTour.rows[0];
    if (!base) {
      return [];
    }

    const result = await pool.query(
      `SELECT *
       FROM tours
       WHERE
         is_active = TRUE
         AND id <> $1
         AND (
           (category IS NOT DISTINCT FROM $2)
           OR (difficulty IS NOT DISTINCT FROM $3)
         )
       ORDER BY COALESCE(rating, 0) DESC, created_at DESC
       LIMIT $4`,
      [tourId, base.category ?? null, base.difficulty ?? null, Math.min(Math.max(limit, 1), 20)]
    );
    return result.rows.map(row => tourService.normalize(row));
  },
};
