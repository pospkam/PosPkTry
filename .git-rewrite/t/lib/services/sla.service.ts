/**
 * SLA Service
 * Functions related to SLA policies, violations, and compliance metrics.
 */

import { pool } from './_helpers';

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
