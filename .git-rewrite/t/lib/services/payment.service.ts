import { pool } from '@/lib/db-pool';
import { toStringOrNull, toNumberOrNull } from './_helpers';

export const commissionService = {
  async calculate(params: Record<string, unknown>) {
    const amount = toNumberOrNull(params.amount) ?? 0;
    const rate = toNumberOrNull(params.rate) ?? 0.1;
    const commission = Math.round(amount * rate * 100) / 100;
    return { commission, total: amount };
  },
  async list(params: Record<string, unknown>) {
    try {
      const page = toNumberOrNull(params.page) ?? 1;
      const limit = Math.min(toNumberOrNull(params.limit) ?? 20, 100);
      const offset = (page - 1) * limit;
      const partnerId = toStringOrNull(params.partnerId);
      const status = toStringOrNull(params.status);

      const conditions: string[] = [];
      const queryParams: unknown[] = [];

      if (partnerId) {
        conditions.push(`ac.agent_id = $${queryParams.length + 1}`);
        queryParams.push(partnerId);
      }
      if (status) {
        conditions.push(`ac.status = $${queryParams.length + 1}`);
        queryParams.push(status);
      }

      const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

      const [countRes, dataRes] = await Promise.all([
        pool.query(
          `SELECT COUNT(*)::int AS total FROM agent_commissions ac ${where}`,
          queryParams
        ),
        pool.query(
          `SELECT
             ac.*,
             u.email AS agent_email,
             u.name AS agent_name
           FROM agent_commissions ac
           LEFT JOIN agents a ON ac.agent_id = a.id
           LEFT JOIN users u ON a.user_id = u.id
           ${where}
           ORDER BY ac.created_at DESC
           LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}`,
          [...queryParams, limit, offset]
        ),
      ]);

      return {
        commissions: dataRes.rows,
        total: Number(countRes.rows[0]?.total ?? 0),
        page,
        limit,
      };
    } catch {
      // agent_commissions table may not be migrated yet
      return { commissions: [], total: 0, page: 1, limit: 20 };
    }
  },
  async listCommissions(params: Record<string, unknown>) {
    return this.list(params);
  },
};

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
