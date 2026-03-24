/**
 * ObservationLogger — записывает все решения агентов в ai_actions_log.
 * Основа для понимания паттернов и обучения системы (Learning Layer, Нед. 3-4).
 */

import { pool } from '@/lib/db-pool';

export interface ObservationEntry {
  agent_name: string;
  intent?: string;
  decision?: string;
  result: 'success' | 'fail' | 'pending';
  duration_ms?: number;
  user_id?: number;
  error_message?: string;
  provider?: string;
  tokens_in?: number;
  tokens_out?: number;
}

export class ObservationLogger {
  async log(entry: ObservationEntry): Promise<void> {
    try {
      await pool.query(
        `INSERT INTO ai_actions_log (action_type, metadata)
         VALUES ($1, $2)`,
        [
          `agent_${entry.agent_name}`,
          JSON.stringify({
            intent: entry.intent,
            decision: entry.decision,
            result: entry.result,
            duration_ms: entry.duration_ms,
            user_id: entry.user_id,
            error_message: entry.error_message,
            provider: entry.provider,
            tokens_in: entry.tokens_in,
            tokens_out: entry.tokens_out,
          }),
        ]
      );
    } catch {
      // Логирование наблюдений не должно ломать основной поток
    }
  }

  async getRecentByAgent(agentName: string, limit = 50): Promise<AgentObservation[]> {
    const { rows } = await pool.query<AgentObservationRow>(
      `SELECT id, action_type, metadata, created_at
       FROM ai_actions_log
       WHERE action_type = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [`agent_${agentName}`, limit]
    );
    return rows.map(r => ({
      id: r.id,
      agent_name: agentName,
      metadata: r.metadata as Record<string, unknown>,
      created_at: r.created_at,
    }));
  }

  async getSuccessRate(agentName: string, hours = 24): Promise<number> {
    const { rows } = await pool.query<{ total: string; success: string }>(
      `SELECT
         COUNT(*)::text AS total,
         COUNT(*) FILTER (WHERE metadata->>'result' = 'success')::text AS success
       FROM ai_actions_log
       WHERE action_type = $1
         AND created_at >= NOW() - ($2 || ' hours')::interval`,
      [`agent_${agentName}`, hours]
    );
    const total = parseInt(rows[0]?.total ?? '0', 10);
    const success = parseInt(rows[0]?.success ?? '0', 10);
    return total === 0 ? 1 : success / total;
  }
}

interface AgentObservationRow {
  id: string;
  action_type: string;
  metadata: unknown;
  created_at: Date;
}

export interface AgentObservation {
  id: string;
  agent_name: string;
  metadata: Record<string, unknown>;
  created_at: Date;
}
