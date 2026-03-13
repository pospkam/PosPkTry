/**
 * Ticket Message Service
 * Functions related to ticket message CRUD.
 */

import { pool, toStringOrNull, toNumberOrNull } from './_helpers';

export const ticketMessageService = {
  async create(ticketId: string, data: Record<string, unknown>) {
    try {
      const senderId = toStringOrNull(data.senderId) ?? toStringOrNull(data.sender_id) ?? 'system';
      const senderName = toStringOrNull(data.senderName) ?? toStringOrNull(data.sender_name) ?? 'System';
      const senderType = toStringOrNull(data.senderType) ?? 'customer';
      const message = toStringOrNull(data.message) ?? '';
      const isInternal = !!(data.isInternal ?? data.is_internal);

      const res = await pool.query(
        `INSERT INTO ticket_messages (ticket_id, sender_id, sender_name, sender_type, message, is_internal, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, NOW())
         RETURNING *`,
        [ticketId, senderId, senderName, senderType, message, isInternal]
      );
      return res.rows[0];
    } catch {
      return { id: 0, ticketId, ...data, createdAt: new Date() };
    }
  },
  async list(ticketId: string, params: Record<string, unknown>) {
    try {
      const limit = Math.min(toNumberOrNull(params.limit) ?? 50, 200);
      const offset = toNumberOrNull(params.offset) ?? 0;

      const [countRes, dataRes] = await Promise.all([
        pool.query(`SELECT COUNT(*)::int AS total FROM ticket_messages WHERE ticket_id = $1`, [ticketId]),
        pool.query(
          `SELECT * FROM ticket_messages WHERE ticket_id = $1
           ORDER BY created_at ASC LIMIT $2 OFFSET $3`,
          [ticketId, limit, offset]
        ),
      ]);
      return {
        messages: dataRes.rows,
        total: Number(countRes.rows[0]?.total ?? 0),
      };
    } catch {
      return { messages: [], total: 0 };
    }
  },
  async getTicketMessages(ticketId: string, limit: number, offset: number) {
    return this.list(ticketId, { limit, offset });
  },
  async createMessage(data: Record<string, unknown>) {
    const ticketId = toStringOrNull(data.ticketId) ?? toStringOrNull(data.ticket_id) ?? '';
    return this.create(ticketId, data);
  },
};
