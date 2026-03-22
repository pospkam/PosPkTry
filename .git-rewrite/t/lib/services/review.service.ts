/**
 * Review Service
 * Functions related to review CRUD, moderation, and statistics.
 */

import {
  pool,
  toStringOrNull,
  toNumberOrNull,
  toBooleanOrNull,
  ReviewNotFoundError,
  ReviewValidationError,
  DuplicateReviewError,
} from './_helpers';

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
