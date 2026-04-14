/**
 * lib/agents/run-logger.ts
 *
 * Logs each agent cron run to agent_run_history.
 * Fire-and-forget — never throws, never blocks the main flow.
 */

import { pool } from '@/lib/db-pool';

export interface RunLogParams {
  agent_id: string;
  status: 'success' | 'partial' | 'failed';
  started_at: Date;
  duration_ms: number;
  items_processed?: number;
  items_created?: number;
  errors_count?: number;
  error_msg?: string;
  metadata?: Record<string, unknown>;
}

export async function logAgentRun(params: RunLogParams): Promise<void> {
  const ended_at = new Date(params.started_at.getTime() + params.duration_ms);
  try {
    await pool.query(
      `INSERT INTO agent_run_history
         (agent_id, status, started_at, ended_at, duration_ms,
          items_processed, items_created, errors_count, error_msg, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        params.agent_id,
        params.status,
        params.started_at,
        ended_at,
        params.duration_ms,
        params.items_processed ?? null,
        params.items_created ?? null,
        params.errors_count ?? 0,
        params.error_msg ?? null,
        params.metadata ? JSON.stringify(params.metadata) : null,
      ]
    );
  } catch (err) {
    console.error('[run-logger] Failed to log run for', params.agent_id, err instanceof Error ? err.message : err);
  }
}
