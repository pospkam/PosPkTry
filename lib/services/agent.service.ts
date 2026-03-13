/**
 * Agent Service
 * Functions related to agent CRUD and listing.
 */

import { pool, toStringOrNull } from './_helpers';

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
