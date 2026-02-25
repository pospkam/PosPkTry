/**
 * Service Stubs
 * Заглушки для сервисов, ожидающих реализации
 * TODO: Заменить реальными реализациями из pillars/
 */

import { pool } from '@/lib/db';

// ========================================
// Error Classes
// ========================================

export class TourNotFoundError extends Error {
  constructor(id?: string) {
    super(id ? `Tour not found: ${id}` : 'Tour not found');
    this.name = 'TourNotFoundError';
  }
}

export class TourValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'TourValidationError';
  }
}

export class TourAlreadyPublishedError extends Error {
  constructor(id?: string) {
    super(id ? `Tour already published: ${id}` : 'Tour already published');
    this.name = 'TourAlreadyPublishedError';
  }
}

export class ReviewNotFoundError extends Error {
  constructor(id?: string) {
    super(id ? `Review not found: ${id}` : 'Review not found');
    this.name = 'ReviewNotFoundError';
  }
}

export class ReviewValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ReviewValidationError';
  }
}

export class DuplicateReviewError extends Error {
  constructor(message = 'Review already exists') {
    super(message);
    this.name = 'DuplicateReviewError';
  }
}

function toStringOrNull(value: unknown): string | null {
  return typeof value === 'string' ? value : null;
}

function toNumberOrNull(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function toBooleanOrNull(value: unknown): boolean | null {
  if (typeof value === 'boolean') {
    return value;
  }
  if (value === 'true') {
    return true;
  }
  if (value === 'false') {
    return false;
  }
  return null;
}

const notificationPreferencesStore = new Map<string, Record<string, unknown>>();

interface InMemoryConversationRecord {
  id: string;
  userId: string;
  context: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface InMemoryMessageRecord {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: Record<string, unknown>;
  timestamp: string;
}

const messagingConversationStore = new Map<string, InMemoryConversationRecord>();
const messagingMessageStore = new Map<string, InMemoryMessageRecord>();

// ========================================
// Tour Service
// ========================================

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

// ========================================
// Review Service
// ========================================

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

// ========================================
// Booking Service
// ========================================

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

// ========================================
// Agent Service
// ========================================

export const agentService = {
  async getById(id: string) {
    try {
      const result = await pool.query(`SELECT * FROM agents WHERE id = $1`, [id]);
      return result.rows[0] || null;
    } catch {
      return null;
    }
  },
  async list(params: Record<string, unknown>) {
    try {
      const result = await pool.query(`SELECT * FROM agents ORDER BY created_at DESC LIMIT 50`);
      return { agents: result.rows, total: result.rows.length };
    } catch {
      return { agents: [], total: 0 };
    }
  },
  async create(data: Record<string, unknown>) {
    return { id: crypto.randomUUID(), ...data, createdAt: new Date() };
  },
  async createAgent(data: Record<string, unknown>) {
    return this.create(data);
  },
  async getAvailableAgents(category: string) {
    const result = await this.list({});
    return result.agents.filter(agent => {
      if (!agent || typeof agent !== 'object') {
        return false;
      }
      const record = agent as Record<string, unknown>;
      const agentCategory = toStringOrNull(record.category);
      return agentCategory ? agentCategory === category : true;
    });
  },
  async update(id: string, data: Record<string, unknown>) {
    return { id, ...data, updatedAt: new Date() };
  },
};

// ========================================
// Partner Service
// ========================================

export const partnerService = {
  normalize(row: Record<string, unknown> | null) {
    if (!row) return null;
    return {
      id: row.id,
      userId: row.user_id ?? row.userId ?? null,
      type: toStringOrNull(row.type),
      companyName: toStringOrNull(row.company_name ?? row.companyName),
      verified: toBooleanOrNull(row.verified) ?? false,
      createdAt: row.created_at ?? row.createdAt ?? null,
      updatedAt: row.updated_at ?? row.updatedAt ?? null,
    };
  },
  async getById(id: string) {
    const result = await pool.query(`SELECT * FROM partners WHERE id = $1`, [id]);
    return this.normalize(result.rows[0] ?? null);
  },
  async getPartner(id: string) {
    const partner = await this.getById(id);
    if (!partner) {
      throw new Error('Partner not found');
    }
    return partner;
  },
  async list(params: Record<string, unknown>) {
    const page = Math.max(toNumberOrNull(params.page) ?? 1, 1);
    const limit = Math.min(Math.max(toNumberOrNull(params.limit) ?? 20, 1), 100);
    const offset = (page - 1) * limit;
    const status = toStringOrNull(params.status);
    const type = toStringOrNull(params.type);

    const conditions: string[] = [];
    const values: unknown[] = [];

    if (type) {
      conditions.push(`type = $${values.length + 1}`);
      values.push(type);
    }

    if (status === 'verified' || status === 'active') {
      conditions.push(`verified = TRUE`);
    } else if (status === 'pending') {
      conditions.push(`verified = FALSE`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM partners ${whereClause}`,
      values
    );
    const total = Number(countResult.rows[0]?.total ?? 0);

    const result = await pool.query(
      `SELECT * FROM partners ${whereClause} ORDER BY created_at DESC LIMIT $${values.length + 1} OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );
    return {
      partners: result.rows.map(row => this.normalize(row)),
      total,
      hasMore: offset + limit < total,
      page,
      limit,
    };
  },
  async listPartners(params: Record<string, unknown>) {
    const result = await this.list(params);
    return {
      success: true,
      data: result.partners,
      pagination: {
        page: result.page,
        limit: result.limit,
        total: result.total,
        hasMore: result.hasMore,
      },
    };
  },
  async create(data: Record<string, unknown>) {
    const userId = toStringOrNull(data.userId) ?? toStringOrNull(data.user_id);
    const type = toStringOrNull(data.type) ?? 'operator';
    const companyName = toStringOrNull(data.companyName) ?? toStringOrNull(data.company_name) ?? 'Partner';
    const verified = toBooleanOrNull(data.verified) ?? false;

    if (!userId) {
      throw new Error('userId is required');
    }

    const result = await pool.query(
      `INSERT INTO partners (user_id, type, company_name, verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())
       RETURNING *`,
      [userId, type, companyName, verified]
    );

    return this.normalize(result.rows[0] ?? null);
  },
  async createPartner(data: Record<string, unknown>) {
    return this.create(data);
  },
  async update(id: string, data: Record<string, unknown>) {
    const updates: string[] = [];
    const values: unknown[] = [];

    const companyName = toStringOrNull(data.companyName) ?? toStringOrNull(data.company_name);
    if (companyName) {
      updates.push(`company_name = $${values.length + 1}`);
      values.push(companyName);
    }

    const type = toStringOrNull(data.type);
    if (type) {
      updates.push(`type = $${values.length + 1}`);
      values.push(type);
    }

    const verified = toBooleanOrNull(data.verified);
    if (verified !== null) {
      updates.push(`verified = $${values.length + 1}`);
      values.push(verified);
    }

    if (updates.length === 0) {
      return this.getPartner(id);
    }

    values.push(id);
    const result = await pool.query(
      `UPDATE partners
       SET ${updates.join(', ')}, updated_at = NOW()
       WHERE id = $${values.length}
       RETURNING *`,
      values
    );

    if (!result.rows[0]) {
      throw new Error('Partner not found');
    }
    return this.normalize(result.rows[0] ?? null);
  },
  async updatePartner(id: string, data: Record<string, unknown>) {
    return this.update(id, data);
  },
  async activatePartner(id: string) {
    return this.update(id, { verified: true });
  },
};

// ========================================
// Commission Service
// ========================================

export const commissionService = {
  async calculate(params: Record<string, unknown>) {
    return { commission: 0, total: 0 };
  },
  async list(params: Record<string, unknown>) {
    return { commissions: [], total: 0 };
  },
  async listCommissions(params: Record<string, unknown>) {
    return this.list(params);
  },
};

// ========================================
// Dashboard Service
// ========================================

export const dashboardService = {
  async getStats(params: Record<string, unknown>) {
    return { bookings: 0, revenue: 0, tours: 0, users: 0 };
  },
  async getSummary() {
    return { success: true, data: {} };
  },
  async getUserDashboards(userId: string) {
    return [
      {
        id: 'default',
        userId,
        name: 'Default Dashboard',
        widgets: [],
      },
    ];
  },
  async createDashboard(data: Record<string, unknown>, userId: string) {
    return {
      id: crypto.randomUUID(),
      userId,
      ...data,
      createdAt: new Date().toISOString(),
    };
  },
};

// ========================================
// Feedback Service
// ========================================

export const feedbackService = {
  async create(data: Record<string, unknown>) {
    return { id: crypto.randomUUID(), ...data, createdAt: new Date() };
  },
  async list(params: Record<string, unknown>) {
    return { feedbacks: [], total: 0 };
  },
  async createFeedback(data: Record<string, unknown>) {
    return this.create(data);
  },
  async createSurvey(data: Record<string, unknown>) {
    return this.create(data);
  },
  async listFeedback(params: Record<string, unknown>) {
    const result = await this.list(params);
    return {
      success: true,
      data: result.feedbacks,
      total: result.total,
    };
  },
};

// ========================================
// Knowledge Base Service
// ========================================

export const knowledgeBaseService = {
  async search(query: string) {
    return { articles: [], total: 0 };
  },
  async list(params: Record<string, unknown>) {
    return { articles: [], total: 0 };
  },
  async getById(id: string) {
    return null;
  },
  async create(data: Record<string, unknown>) {
    return { id: crypto.randomUUID(), ...data };
  },
  async update(id: string, data: Record<string, unknown>) {
    return { id, ...data };
  },
  async searchArticles(filter: Record<string, unknown>) {
    const search = toStringOrNull(filter.search) ?? '';
    const result = await this.search(search);
    return {
      success: true,
      data: result.articles,
      total: result.total,
      page: toNumberOrNull(filter.page) ?? 1,
      limit: toNumberOrNull(filter.limit) ?? 20,
    };
  },
  async createArticle(data: Record<string, unknown>, author: string) {
    return this.create({
      ...data,
      author,
      createdAt: new Date().toISOString(),
    });
  },
};

// ========================================
// Messaging Service
// ========================================

export const messagingService = {
  parseJsonObject(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }

    if (typeof value === 'string') {
      try {
        const parsed: unknown = JSON.parse(value);
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          return parsed as Record<string, unknown>;
        }
      } catch {
        return {};
      }
    }

    return {};
  },
  extractParticipantIds(context: Record<string, unknown>, ownerUserId?: string | null): string[] {
    const participantIdsRaw = context.participantIds;
    const participantIds = Array.isArray(participantIdsRaw)
      ? participantIdsRaw.filter((value): value is string => typeof value === 'string')
      : [];

    if (ownerUserId && !participantIds.includes(ownerUserId)) {
      participantIds.push(ownerUserId);
    }

    return Array.from(new Set(participantIds));
  },
  normalizeConversation(row: Record<string, unknown> | null) {
    if (!row) {
      return null;
    }

    const context = this.parseJsonObject(row.context);
    const ownerUserId = toStringOrNull(row.user_id ?? row.userId);
    const participantIds = this.extractParticipantIds(context, ownerUserId);
    const lastMessageId = toStringOrNull(row.last_message_id);
    const lastMessageTimestamp = row.last_message_timestamp ?? null;

    return {
      id: row.id,
      userId: ownerUserId,
      user_id: ownerUserId,
      type: toStringOrNull(context.type) ?? 'direct',
      subject: toStringOrNull(context.subject),
      description: toStringOrNull(context.description),
      participantIds,
      participant_ids: participantIds,
      relatedTourId: context.relatedTourId ?? null,
      relatedBookingId: context.relatedBookingId ?? null,
      relatedReviewId: context.relatedReviewId ?? null,
      lastMessage: lastMessageId
        ? {
            id: lastMessageId,
            content: toStringOrNull(row.last_message_content) ?? '',
            role: toStringOrNull(row.last_message_role) ?? 'user',
            timestamp: lastMessageTimestamp,
          }
        : null,
      createdAt: row.created_at ?? row.createdAt ?? null,
      updatedAt: row.updated_at ?? row.updatedAt ?? null,
      context,
    };
  },
  normalizeMessage(row: Record<string, unknown> | null) {
    if (!row) {
      return null;
    }

    const metadata = this.parseJsonObject(row.metadata);
    const senderId = toStringOrNull(metadata.senderId ?? metadata.sender_id ?? row.session_user_id);
    const conversationId = row.session_id ?? row.sessionId ?? null;

    return {
      id: row.id,
      conversationId,
      conversation_id: conversationId,
      senderId,
      sender_id: senderId,
      role: toStringOrNull(row.role) ?? 'user',
      type: toStringOrNull(metadata.type) ?? 'text',
      content: toStringOrNull(row.content) ?? '',
      attachments: Array.isArray(metadata.attachments) ? metadata.attachments : [],
      repliedToMessageId: metadata.repliedToMessageId ?? metadata.replied_to_message_id ?? null,
      metadata,
      timestamp: row.timestamp ?? null,
      createdAt: row.timestamp ?? row.created_at ?? row.createdAt ?? null,
      updatedAt: row.timestamp ?? row.updated_at ?? row.updatedAt ?? null,
    };
  },
  async isConversationMember(conversationId: string, userId: string) {
    try {
      const result = await pool.query(
        `SELECT 1
         FROM chat_sessions s
         WHERE s.id = $1
           AND (
             s.user_id = $2
             OR COALESCE(s.context->'participantIds', '[]'::jsonb) ? $2
           )
         LIMIT 1`,
        [conversationId, userId]
      );
      return result.rows.length > 0;
    } catch {
      const localConversation = messagingConversationStore.get(conversationId);
      if (!localConversation) {
        return false;
      }
      const context = this.parseJsonObject(localConversation.context);
      const participantIds = this.extractParticipantIds(context, localConversation.userId);
      return participantIds.includes(userId);
    }
  },
  async send(data: Record<string, unknown>) {
    const senderId = toStringOrNull(data.senderId) ?? toStringOrNull(data.userId);
    if (!senderId) {
      return { messageId: null, status: 'failed' };
    }

    const message = await this.sendMessage(data, senderId);
    if (!message) {
      return { messageId: null, status: 'forbidden_or_not_found' };
    }

    return { messageId: message.id, status: 'sent' };
  },
  async list(params: Record<string, unknown>) {
    const conversationId = toStringOrNull(params.conversationId) ?? toStringOrNull(params.sessionId);
    const userId = toStringOrNull(params.userId);
    const limit = Math.min(Math.max(toNumberOrNull(params.limit) ?? 50, 1), 100);
    const offset = Math.max(toNumberOrNull(params.offset) ?? 0, 0);

    if (!conversationId) {
      return { messages: [], total: 0 };
    }

    const result = await this.getMessages(conversationId, {}, limit, offset, userId ?? undefined);
    if (!result) {
      return { messages: [], total: 0 };
    }

    return { messages: result.messages, total: result.total };
  },
  async getMessages(
    conversationId: string,
    filters: Record<string, unknown>,
    limit = 50,
    offset = 0,
    userId?: string
  ) {
    const normalizedLimit = Math.min(Math.max(limit, 1), 100);
    const normalizedOffset = Math.max(offset, 0);

    try {
      if (userId) {
        const member = await this.isConversationMember(conversationId, userId);
        if (!member) {
          return null;
        }
      } else {
        const existsResult = await pool.query(
          `SELECT 1 FROM chat_sessions WHERE id = $1 LIMIT 1`,
          [conversationId]
        );
        if (existsResult.rows.length === 0) {
          return null;
        }
      }

      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total
         FROM chat_messages
         WHERE session_id = $1`,
        [conversationId]
      );
      const total = Number(countResult.rows[0]?.total ?? 0);

      const result = await pool.query(
        `SELECT
           m.*,
           s.user_id AS session_user_id,
           s.context AS session_context
         FROM chat_messages m
         JOIN chat_sessions s ON s.id = m.session_id
         WHERE m.session_id = $1
         ORDER BY m.timestamp ASC
         LIMIT $2 OFFSET $3`,
        [conversationId, normalizedLimit, normalizedOffset]
      );

      return {
        messages: result.rows.map(row => this.normalizeMessage(row)),
        total,
        conversationId,
        limit: normalizedLimit,
        offset: normalizedOffset,
        filters,
      };
    } catch {
      const localConversation = messagingConversationStore.get(conversationId);
      if (!localConversation) {
        return null;
      }

      const context = this.parseJsonObject(localConversation.context);
      const participantIds = this.extractParticipantIds(context, localConversation.userId);
      if (userId && !participantIds.includes(userId)) {
        return null;
      }

      const allMessages = Array.from(messagingMessageStore.values())
        .filter(message => message.sessionId === conversationId)
        .sort((a, b) => a.timestamp.localeCompare(b.timestamp));

      const paginatedMessages = allMessages
        .slice(normalizedOffset, normalizedOffset + normalizedLimit)
        .map(message => this.normalizeMessage({
          ...message,
          session_user_id: localConversation.userId,
        }));

      return {
        messages: paginatedMessages,
        total: allMessages.length,
        conversationId,
        limit: normalizedLimit,
        offset: normalizedOffset,
        filters,
      };
    }
  },
  async getMessage(id: string) {
    try {
      const result = await pool.query(
        `SELECT
           m.*,
           s.user_id AS session_user_id,
           s.context AS session_context
         FROM chat_messages m
         JOIN chat_sessions s ON s.id = m.session_id
         WHERE m.id = $1
         LIMIT 1`,
        [id]
      );
      return this.normalizeMessage(result.rows[0] ?? null);
    } catch {
      const localMessage = messagingMessageStore.get(id);
      if (!localMessage) {
        return null;
      }

      const localConversation = messagingConversationStore.get(localMessage.sessionId);
      return this.normalizeMessage({
        ...localMessage,
        session_user_id: localConversation?.userId ?? null,
        session_context: localConversation?.context ?? {},
      });
    }
  },
  async getMessageForUser(id: string, userId: string) {
    try {
      const result = await pool.query(
        `SELECT
           m.*,
           s.user_id AS session_user_id,
           s.context AS session_context
         FROM chat_messages m
         JOIN chat_sessions s ON s.id = m.session_id
         WHERE m.id = $1
           AND (
             s.user_id = $2
             OR COALESCE(s.context->'participantIds', '[]'::jsonb) ? $2
           )
         LIMIT 1`,
        [id, userId]
      );

      return this.normalizeMessage(result.rows[0] ?? null);
    } catch {
      const localMessage = messagingMessageStore.get(id);
      if (!localMessage) {
        return null;
      }

      const localConversation = messagingConversationStore.get(localMessage.sessionId);
      if (!localConversation) {
        return null;
      }

      const context = this.parseJsonObject(localConversation.context);
      const participantIds = this.extractParticipantIds(context, localConversation.userId);
      if (!participantIds.includes(userId)) {
        return null;
      }

      return this.normalizeMessage({
        ...localMessage,
        session_user_id: localConversation.userId,
        session_context: localConversation.context,
      });
    }
  },
  async sendMessage(data: Record<string, unknown>, senderId: string) {
    const conversationId = toStringOrNull(data.conversationId) ?? toStringOrNull(data.sessionId);
    const content = toStringOrNull(data.content)?.trim() ?? '';
    const type = toStringOrNull(data.type) ?? 'text';
    const attachments = Array.isArray(data.attachments) ? data.attachments : [];
    const repliedToMessageId = toStringOrNull(data.repliedToMessageId);

    if (!conversationId || !content) {
      return null;
    }

    const member = await this.isConversationMember(conversationId, senderId);
    if (!member) {
      return null;
    }

    try {
      const metadata = {
        senderId,
        type,
        attachments,
        repliedToMessageId,
      };

      const insertResult = await pool.query(
        `INSERT INTO chat_messages (session_id, role, content, timestamp, metadata)
         VALUES ($1, 'user', $2, NOW(), $3::jsonb)
         RETURNING id`,
        [conversationId, content, JSON.stringify(metadata)]
      );
      const insertedMessageId = toStringOrNull(insertResult.rows[0]?.id);
      if (!insertedMessageId) {
        return null;
      }

      await pool.query(
        `UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1`,
        [conversationId]
      );

      return this.getMessage(insertedMessageId);
    } catch {
      const localConversation = messagingConversationStore.get(conversationId);
      if (!localConversation) {
        return null;
      }

      const localContext = this.parseJsonObject(localConversation.context);
      const participantIds = this.extractParticipantIds(localContext, localConversation.userId);
      if (!participantIds.includes(senderId)) {
        return null;
      }

      const nowIso = new Date().toISOString();
      const localMessageId = crypto.randomUUID();
      const metadata: Record<string, unknown> = {
        senderId,
        type,
        attachments,
        repliedToMessageId,
      };

      messagingMessageStore.set(localMessageId, {
        id: localMessageId,
        sessionId: conversationId,
        role: 'user',
        content,
        metadata,
        timestamp: nowIso,
      });

      messagingConversationStore.set(conversationId, {
        ...localConversation,
        updatedAt: nowIso,
      });

      return this.normalizeMessage({
        id: localMessageId,
        session_id: conversationId,
        role: 'user',
        content,
        metadata,
        timestamp: nowIso,
        session_user_id: localConversation.userId,
        session_context: localConversation.context,
      });
    }
  },
  async markAsRead(id: string, userId: string, bypassMembership = false) {
    const currentMessage = bypassMembership
      ? await this.getMessage(id)
      : await this.getMessageForUser(id, userId);
    if (!currentMessage) {
      return false;
    }

    try {
      await pool.query(
        `UPDATE chat_messages
         SET metadata = COALESCE(metadata, '{}'::jsonb)
           || jsonb_build_object('lastReadBy', $2, 'lastReadAt', NOW())
         WHERE id = $1`,
        [id, userId]
      );
    } catch {
      const localMessage = messagingMessageStore.get(id);
      if (localMessage) {
        messagingMessageStore.set(id, {
          ...localMessage,
          metadata: {
            ...localMessage.metadata,
            lastReadBy: userId,
            lastReadAt: new Date().toISOString(),
          },
        });
      }
    }

    return true;
  },
  async deleteMessage(id: string, userId: string, bypassMembership = false) {
    if (bypassMembership) {
      try {
        const result = await pool.query(
          `DELETE FROM chat_messages WHERE id = $1 RETURNING id`,
          [id]
        );
        return result.rows.length > 0;
      } catch {
        return messagingMessageStore.delete(id);
      }
    }

    try {
      const result = await pool.query(
        `DELETE FROM chat_messages m
         USING chat_sessions s
         WHERE m.session_id = s.id
           AND m.id = $1
           AND (
             s.user_id = $2
             OR COALESCE(s.context->'participantIds', '[]'::jsonb) ? $2
           )
         RETURNING m.id`,
        [id, userId]
      );
      return result.rows.length > 0;
    } catch {
      const localMessage = messagingMessageStore.get(id);
      if (!localMessage) {
        return false;
      }

      const localConversation = messagingConversationStore.get(localMessage.sessionId);
      if (!localConversation) {
        return false;
      }

      const context = this.parseJsonObject(localConversation.context);
      const participantIds = this.extractParticipantIds(context, localConversation.userId);
      if (!participantIds.includes(userId)) {
        return false;
      }

      return messagingMessageStore.delete(id);
    }
  },
  async listConversations(
    userId: string,
    filters: Record<string, unknown>,
    limit = 50,
    offset = 0
  ) {
    const normalizedLimit = Math.min(Math.max(limit, 1), 100);
    const normalizedOffset = Math.max(offset, 0);

    try {
      const countResult = await pool.query(
        `SELECT COUNT(*)::int AS total
         FROM chat_sessions s
         WHERE
           s.user_id = $1
           OR COALESCE(s.context->'participantIds', '[]'::jsonb) ? $1`,
        [userId]
      );
      const total = Number(countResult.rows[0]?.total ?? 0);

      const result = await pool.query(
        `SELECT
           s.*,
           lm.id AS last_message_id,
           lm.content AS last_message_content,
           lm.role AS last_message_role,
           lm.timestamp AS last_message_timestamp
         FROM chat_sessions s
         LEFT JOIN LATERAL (
           SELECT id, content, role, timestamp
           FROM chat_messages m
           WHERE m.session_id = s.id
           ORDER BY timestamp DESC
           LIMIT 1
         ) lm ON TRUE
         WHERE
           s.user_id = $1
           OR COALESCE(s.context->'participantIds', '[]'::jsonb) ? $1
         ORDER BY COALESCE(lm.timestamp, s.updated_at) DESC
         LIMIT $2 OFFSET $3`,
        [userId, normalizedLimit, normalizedOffset]
      );

      return {
        conversations: result.rows.map(row => this.normalizeConversation(row)),
        total,
        limit: normalizedLimit,
        offset: normalizedOffset,
        filters,
        userId,
      };
    } catch {
      const userConversations = Array.from(messagingConversationStore.values())
        .filter(conversation => {
          const context = this.parseJsonObject(conversation.context);
          const participantIds = this.extractParticipantIds(context, conversation.userId);
          return participantIds.includes(userId);
        })
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));

      return {
        conversations: userConversations
          .slice(normalizedOffset, normalizedOffset + normalizedLimit)
          .map(conversation => this.normalizeConversation({
            id: conversation.id,
            user_id: conversation.userId,
            context: conversation.context,
            created_at: conversation.createdAt,
            updated_at: conversation.updatedAt,
          })),
        total: userConversations.length,
        limit: normalizedLimit,
        offset: normalizedOffset,
        filters,
        userId,
      };
    }
  },
  async createConversation(data: Record<string, unknown>, createdBy: string) {
    const inputParticipantIds = Array.isArray(data.participantIds)
      ? data.participantIds.filter((value): value is string => typeof value === 'string')
      : [];
    const participantIds = Array.from(new Set([createdBy, ...inputParticipantIds]));

    const context: Record<string, unknown> = {
      type: toStringOrNull(data.type) ?? 'direct',
      subject: toStringOrNull(data.subject),
      description: toStringOrNull(data.description),
      relatedTourId: data.relatedTourId ?? null,
      relatedBookingId: data.relatedBookingId ?? null,
      relatedReviewId: data.relatedReviewId ?? null,
      participantIds,
      createdBy,
    };

    try {
      const sessionResult = await pool.query(
        `INSERT INTO chat_sessions (user_id, context, created_at, updated_at)
         VALUES ($1, $2::jsonb, NOW(), NOW())
         RETURNING *`,
        [createdBy, JSON.stringify(context)]
      );

      const conversation = this.normalizeConversation(sessionResult.rows[0] ?? null);
      if (!conversation) {
        return null;
      }

      const firstMessage = toStringOrNull(data.firstMessage)?.trim();
      if (firstMessage) {
        const createdMessage = await this.sendMessage(
          {
            conversationId: conversation.id,
            type: 'text',
            content: firstMessage,
          },
          createdBy
        );
        if (createdMessage) {
          return {
            ...conversation,
            lastMessage: {
              id: createdMessage.id,
              content: createdMessage.content,
              role: createdMessage.role,
              timestamp: createdMessage.timestamp,
            },
          };
        }
      }

      return conversation;
    } catch {
      const nowIso = new Date().toISOString();
      const conversationId = crypto.randomUUID();
      const localConversation: InMemoryConversationRecord = {
        id: conversationId,
        userId: createdBy,
        context,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      messagingConversationStore.set(conversationId, localConversation);

      const firstMessage = toStringOrNull(data.firstMessage)?.trim();
      if (firstMessage) {
        await this.sendMessage(
          {
            conversationId,
            type: 'text',
            content: firstMessage,
          },
          createdBy
        );
      }

      return this.normalizeConversation({
        id: conversationId,
        user_id: createdBy,
        context,
        created_at: nowIso,
        updated_at: nowIso,
      });
    }
  },
};

// ========================================
// Metrics Service
// ========================================

export const metricsService = {
  async getMetrics(params: Record<string, unknown>) {
    return { metrics: {}, period: params.period || '7d' };
  },
  async track(event: string, data: Record<string, unknown>) {
    return { success: true };
  },
  async recordMetric(
    type: unknown,
    value: unknown,
    period: unknown,
    metadata: unknown
  ) {
    return {
      id: crypto.randomUUID(),
      type: toStringOrNull(type) ?? 'custom',
      value: toNumberOrNull(value) ?? 0,
      period: toStringOrNull(period) ?? 'custom',
      metadata: (metadata && typeof metadata === 'object') ? metadata : {},
      recordedAt: new Date().toISOString(),
    };
  },
};

// ========================================
// Notification Service
// ========================================

export const notificationService = {
  normalize(row: Record<string, unknown> | null) {
    if (!row) return null;
    const payloadCandidate = row.payload;
    const payload = payloadCandidate && typeof payloadCandidate === 'object'
      ? (payloadCandidate as Record<string, unknown>)
      : {};

    return {
      id: row.id,
      userId: row.user_id ?? row.userId ?? null,
      user_id: row.user_id ?? row.userId ?? null,
      type: toStringOrNull(row.type),
      title: toStringOrNull(payload.title),
      message: toStringOrNull(payload.message),
      channels: Array.isArray(payload.channels) ? payload.channels : [],
      data: payload.data ?? {},
      muted: toBooleanOrNull(payload.muted) ?? false,
      readAt: row.read_at ?? row.readAt ?? null,
      read_at: row.read_at ?? row.readAt ?? null,
      createdAt: row.created_at ?? row.createdAt ?? null,
      updatedAt: row.updated_at ?? row.updatedAt ?? null,
      payload,
    };
  },
  async send(userId: string, data: Record<string, unknown>) {
    return this.create({ userId, ...data });
  },
  async create(data: Record<string, unknown>) {
    const userId = toStringOrNull(data.userId) ?? toStringOrNull(data.user_id);
    if (!userId) {
      throw new Error('userId is required');
    }

    const payload: Record<string, unknown> = {};
    if (toStringOrNull(data.title)) payload.title = toStringOrNull(data.title);
    if (toStringOrNull(data.message)) payload.message = toStringOrNull(data.message);
    if (Array.isArray(data.channels)) payload.channels = data.channels;
    if (data.data && typeof data.data === 'object') payload.data = data.data;
    if (data.scheduledFor) payload.scheduledFor = data.scheduledFor;

    try {
      const result = await pool.query(
        `INSERT INTO notifications (user_id, type, payload, created_at, updated_at)
         VALUES ($1, $2, $3::jsonb, NOW(), NOW())
         RETURNING *`,
        [userId, toStringOrNull(data.type) ?? 'system', JSON.stringify(payload)]
      );
      return this.normalize(result.rows[0] ?? null);
    } catch {
      return {
        id: crypto.randomUUID(),
        userId,
        user_id: userId,
        type: toStringOrNull(data.type) ?? 'system',
        payload,
        readAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  },
  async list(arg1: unknown, arg2?: unknown, arg3?: unknown, arg4?: unknown) {
    const userId = toStringOrNull(arg1);
    const filters = (!userId && arg1 && typeof arg1 === 'object')
      ? (arg1 as Record<string, unknown>)
      : ((arg2 && typeof arg2 === 'object') ? (arg2 as Record<string, unknown>) : {});
    const limit = Math.min(Math.max(toNumberOrNull(userId ? arg3 : arg2) ?? 50, 1), 100);
    const offset = Math.max(toNumberOrNull(userId ? arg4 : arg3) ?? 0, 0);

    if (!userId) {
      return { notifications: [], total: 0 };
    }

    const unreadOnly = toBooleanOrNull(filters.unreadOnly) ?? false;
    const conditions: string[] = ['user_id = $1'];
    const values: unknown[] = [userId];

    if (unreadOnly) {
      conditions.push('read_at IS NULL');
    }

    const whereClause = `WHERE ${conditions.join(' AND ')}`;
    const countResult = await pool.query(
      `SELECT COUNT(*)::int AS total FROM notifications ${whereClause}`,
      values
    );
    const total = Number(countResult.rows[0]?.total ?? 0);

    const rowsResult = await pool.query(
      `SELECT * FROM notifications
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${values.length + 1}
       OFFSET $${values.length + 2}`,
      [...values, limit, offset]
    );

    return {
      notifications: rowsResult.rows.map(row => this.normalize(row)),
      total,
    };
  },
  async getById(id: string) {
    try {
      const result = await pool.query(
        `SELECT * FROM notifications WHERE id = $1 LIMIT 1`,
        [id]
      );
      return this.normalize(result.rows[0] ?? null);
    } catch {
      return null;
    }
  },
  async getByIdForUser(id: string, userId: string) {
    try {
      const result = await pool.query(
        `SELECT * FROM notifications WHERE id = $1 AND user_id = $2 LIMIT 1`,
        [id, userId]
      );
      return this.normalize(result.rows[0] ?? null);
    } catch {
      return null;
    }
  },
  async markRead(id: string, userId: string) {
    try {
      await pool.query(
        `UPDATE notifications
         SET read_at = NOW(), updated_at = NOW()
         WHERE id = $1 AND user_id = $2`,
        [id, userId]
      );
    } catch {
      // no-op fallback
    }
    return { success: true };
  },
  async markAsRead(id: string, userId?: string) {
    if (!userId) {
      try {
        await pool.query(
          `UPDATE notifications
           SET read_at = NOW(), updated_at = NOW()
           WHERE id = $1`,
          [id]
        );
      } catch {
        // no-op fallback
      }
      return { success: true };
    }

    return this.markRead(id, userId);
  },
  async toggleMute(id: string, muted: unknown) {
    const mutedValue = toBooleanOrNull(muted) ?? false;
    try {
      await pool.query(
        `UPDATE notifications
         SET
           payload = jsonb_set(COALESCE(payload, '{}'::jsonb), '{muted}', to_jsonb($2::boolean), true),
           updated_at = NOW()
         WHERE id = $1`,
        [id, mutedValue]
      );
    } catch {
      // no-op fallback
    }
    return { success: true, id, muted: mutedValue };
  },
  async getPreferences(userId: string) {
    const existing = notificationPreferencesStore.get(userId);
    if (existing) {
      return existing;
    }
    return {
      quietHours: null,
      channelPreferences: {},
      typePreferences: {},
      frequencyLimit: null,
      unsubscribeAll: false,
    };
  },
  async updatePreferences(userId: string, preferences: Record<string, unknown>) {
    const current = await this.getPreferences(userId);
    const merged = {
      ...current,
      ...preferences,
      updatedAt: new Date().toISOString(),
    };
    notificationPreferencesStore.set(userId, merged);
    return merged;
  },
  async markAllRead(userId: string) {
    try {
      await pool.query(
        `UPDATE notifications
         SET read_at = NOW(), updated_at = NOW()
         WHERE user_id = $1`,
        [userId]
      );
    } catch {
      // no-op fallback
    }
    return { success: true };
  },
  async deleteById(id: string) {
    try {
      const result = await pool.query(
        `DELETE FROM notifications WHERE id = $1 RETURNING id`,
        [id]
      );
      return result.rows.length > 0;
    } catch {
      return false;
    }
  },
  async deleteByIdForUser(id: string, userId: string) {
    try {
      const result = await pool.query(
        `DELETE FROM notifications WHERE id = $1 AND user_id = $2 RETURNING id`,
        [id, userId]
      );
      return result.rows.length > 0;
    } catch {
      return false;
    }
  },
};

// ========================================
// Payout Service
// ========================================

export const payoutService = {
  async create(data: Record<string, unknown>) {
    return { id: crypto.randomUUID(), ...data, status: 'pending' };
  },
  async list(params: Record<string, unknown>) {
    return { payouts: [], total: 0 };
  },
  async getById(id: string) {
    return null;
  },
  async process(id: string) {
    return { id, status: 'processed' };
  },
  async createPayout(data: Record<string, unknown>) {
    return this.create(data);
  },
  async listPayouts(params: Record<string, unknown>) {
    return this.list(params);
  },
  async processPayout(id: string) {
    return this.process(id);
  },
};

// ========================================
// Report Service
// ========================================

export const reportService = {
  async generate(params: Record<string, unknown>) {
    return { report: {}, generatedAt: new Date().toISOString() };
  },
  async list(params: Record<string, unknown>) {
    return { reports: [], total: 0 };
  },
  async generateReport(data: Record<string, unknown>, generatedBy: string) {
    return this.generate({
      ...data,
      generatedBy,
    });
  },
  async listReports(type: unknown, limit = 20, offset = 0) {
    const response = await this.list({
      type: toStringOrNull(type) ?? undefined,
      limit,
      offset,
    });
    return {
      reports: response.reports,
      total: response.total,
    };
  },
};

// ========================================
// Search Service
// ========================================

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

// ========================================
// SLA Service
// ========================================

export const slaService = {
  async getMetrics(params: Record<string, unknown>) {
    return { sla: {}, violations: [] };
  },
  async list(params: Record<string, unknown>) {
    return { slas: [], total: 0 };
  },
  async getComplianceMetrics(from?: Date, to?: Date) {
    return {
      period: {
        from: from ? from.toISOString() : null,
        to: to ? to.toISOString() : null,
      },
      breached: 0,
      total: 0,
      complianceRate: 100,
    };
  },
  async checkSLAViolation(ticketId: string) {
    return {
      ticketId,
      violated: false,
      checkedAt: new Date().toISOString(),
    };
  },
};

// ========================================
// Ticket Message Service
// ========================================

export const ticketMessageService = {
  async create(ticketId: string, data: Record<string, unknown>) {
    return { id: crypto.randomUUID(), ticketId, ...data, createdAt: new Date() };
  },
  async list(ticketId: string, params: Record<string, unknown>) {
    return { messages: [], total: 0 };
  },
  async getTicketMessages(ticketId: string, limit: number, offset: number) {
    return this.list(ticketId, { limit, offset });
  },
  async createMessage(data: Record<string, unknown>) {
    const ticketId = data.ticketId as string;
    return this.create(ticketId, data);
  },
};
