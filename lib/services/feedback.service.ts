/**
 * Feedback Service
 * Functions related to customer feedback and surveys.
 */

import { pool, toStringOrNull, toNumberOrNull } from './_helpers';

export const feedbackService = {
  async create(data: Record<string, unknown>) {
    try {
      const customerId = toStringOrNull(data.customerId) ?? toStringOrNull(data.customer_id);
      const rating = toNumberOrNull(data.rating) ?? 5;
      const comment = toStringOrNull(data.comment) ?? '';
      const ticketId = toStringOrNull(data.ticketId) ?? toStringOrNull(data.ticket_id);

      if (!customerId) return { id: 0, ...data, createdAt: new Date() };

      const res = await pool.query(
        `INSERT INTO feedback (customer_id, ticket_id, rating, comment, created_at)
         VALUES ($1, $2, $3, $4, NOW())
         RETURNING *`,
        [customerId, ticketId ?? null, rating, comment]
      );
      return res.rows[0];
    } catch {
      return { id: 0, ...data, createdAt: new Date() };
    }
  },
  async list(params: Record<string, unknown>) {
    try {
      const page = toNumberOrNull(params.page) ?? 1;
      const limit = Math.min(toNumberOrNull(params.limit) ?? 20, 100);
      const offset = (page - 1) * limit;

      const [countRes, dataRes] = await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS total FROM feedback`),
        pool.query(
          `SELECT * FROM feedback ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
          [limit, offset]
        ),
      ]);
      return {
        feedbacks: dataRes.rows,
        total: Number(countRes.rows[0]?.total ?? 0),
      };
    } catch {
      return { feedbacks: [], total: 0 };
    }
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
