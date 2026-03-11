import { pool } from '@/lib/db-pool';
import { toStringOrNull, toNumberOrNull } from './_helpers';

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

export const slaService = {
  async getMetrics(_params: Record<string, unknown>) {
    try {
      const res = await pool.query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE acknowledged = FALSE)::int AS active_violations
         FROM sla_violations`
      );
      const row = res.rows[0] ?? {};
      return {
        sla: { total: Number(row.total ?? 0) },
        violations: [],
        activeViolations: Number(row.active_violations ?? 0),
      };
    } catch {
      return { sla: {}, violations: [] };
    }
  },
  async list(_params: Record<string, unknown>) {
    try {
      const res = await pool.query(
        `SELECT id, name, category, priority, first_response_time_hours, resolution_time_hours, active
         FROM sla_policies
         WHERE active = TRUE
         ORDER BY created_at DESC
         LIMIT 50`
      );
      return { slas: res.rows, total: res.rows.length };
    } catch {
      return { slas: [], total: 0 };
    }
  },
  async getComplianceMetrics(from?: Date, to?: Date) {
    try {
      const conditions: string[] = [];
      const params: unknown[] = [];
      if (from) { conditions.push(`created_at >= $${params.length + 1}`); params.push(from); }
      if (to)   { conditions.push(`created_at <= $${params.length + 1}`); params.push(to); }
      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const res = await pool.query(
        `SELECT
           COUNT(*)::int AS total,
           COUNT(*) FILTER (WHERE acknowledged = TRUE)::int AS resolved
         FROM sla_violations ${where}`,
        params
      );
      const row = res.rows[0] ?? {};
      const total = Number(row.total ?? 0);
      const resolved = Number(row.resolved ?? 0);
      return {
        period: { from: from?.toISOString() ?? null, to: to?.toISOString() ?? null },
        breached: total,
        total,
        complianceRate: total === 0 ? 100 : Math.round((resolved / total) * 100),
      };
    } catch {
      return {
        period: { from: from?.toISOString() ?? null, to: to?.toISOString() ?? null },
        breached: 0,
        total: 0,
        complianceRate: 100,
      };
    }
  },
  async checkSLAViolation(ticketId: string) {
    try {
      const res = await pool.query(
        `SELECT COUNT(*)::int AS count FROM sla_violations WHERE ticket_id = $1 AND acknowledged = FALSE`,
        [ticketId]
      );
      return {
        ticketId,
        violated: Number(res.rows[0]?.count ?? 0) > 0,
        checkedAt: new Date().toISOString(),
      };
    } catch {
      return { ticketId, violated: false, checkedAt: new Date().toISOString() };
    }
  },
};

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
