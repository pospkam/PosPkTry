/**
 * ExperimentTracker — A/B тестирование для агентных промптов/стратегий.
 *
 * Позволяет безопасно сравнивать два подхода без изменения продакшна.
 * Всё хранится в agent_experiments + ai_actions_log.
 *
 * Пример использования:
 *   const tracker = new ExperimentTracker();
 *   const exp = await tracker.create({ name: 'digest-format-v2', intent: 'admin_digest', ... });
 *   const variant = tracker.pickVariant(exp.id);
 *   // ... run variant logic ...
 *   await tracker.recordResult(exp.id, variant, 'success', 340);
 */

import { pool } from '@/lib/db-pool';

export interface Experiment {
  id:          string;
  name:        string;
  description: string | null;
  intent:      string | null;
  variant_a:   Record<string, unknown>;
  variant_b:   Record<string, unknown>;
  metric:      string;
  status:      'running' | 'paused' | 'completed';
  winner:      'a' | 'b' | 'tie' | null;
  results:     Record<string, unknown>;
  created_at:  Date;
  updated_at:  Date;
}

export interface CreateExperimentParams {
  name:         string;
  description?: string;
  intent?:      string;
  variant_a:    Record<string, unknown>;
  variant_b:    Record<string, unknown>;
  metric?:      string;
}

export interface ExperimentResults {
  variant_a: { success: number; fail: number; rate: number };
  variant_b: { success: number; fail: number; rate: number };
  winner:    'a' | 'b' | 'tie' | null;
  total:     number;
}

interface ResultRow {
  variant: string;
  outcome: string;
  count:   string;
}

export class ExperimentTracker {
  async create(params: CreateExperimentParams): Promise<Experiment> {
    const { rows } = await pool.query<Experiment>(`
      INSERT INTO agent_experiments (name, description, intent, variant_a, variant_b, metric)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `, [
      params.name,
      params.description ?? null,
      params.intent ?? null,
      JSON.stringify(params.variant_a),
      JSON.stringify(params.variant_b),
      params.metric ?? 'success_rate',
    ]);
    return rows[0];
  }

  async list(status?: string): Promise<Experiment[]> {
    const { rows } = await pool.query<Experiment>(`
      SELECT * FROM agent_experiments
      WHERE ($1::text IS NULL OR status = $1)
      ORDER BY created_at DESC
      LIMIT 50
    `, [status ?? null]);
    return rows;
  }

  async getById(id: string): Promise<Experiment | null> {
    const { rows } = await pool.query<Experiment>(
      `SELECT * FROM agent_experiments WHERE id = $1`,
      [id]
    );
    return rows[0] ?? null;
  }

  async updateStatus(id: string, status: 'running' | 'paused' | 'completed', winner?: 'a' | 'b' | 'tie'): Promise<void> {
    await pool.query(`
      UPDATE agent_experiments
      SET status = $2, winner = $3, updated_at = NOW()
      WHERE id = $1
    `, [id, status, winner ?? null]);
  }

  /**
   * Детерминированный 50/50 split по секунде.
   * Не случайный — чтобы один запрос всегда получал один вариант в рамках минуты.
   */
  pickVariant(_experimentId: string): 'a' | 'b' {
    return new Date().getSeconds() % 2 === 0 ? 'a' : 'b';
  }

  async recordResult(
    experimentId: string,
    variant: 'a' | 'b',
    outcome: 'success' | 'fail',
    durationMs?: number
  ): Promise<void> {
    await pool.query(`
      INSERT INTO ai_actions_log (action_type, metadata)
      VALUES ('agent_experiment_result', $1)
    `, [JSON.stringify({ experiment_id: experimentId, variant, outcome, duration_ms: durationMs })]);
  }

  async calculateResults(experimentId: string): Promise<ExperimentResults> {
    const { rows } = await pool.query<ResultRow>(`
      SELECT
        metadata->>'variant' AS variant,
        metadata->>'outcome' AS outcome,
        COUNT(*)::text       AS count
      FROM ai_actions_log
      WHERE action_type = 'agent_experiment_result'
        AND metadata->>'experiment_id' = $1
      GROUP BY metadata->>'variant', metadata->>'outcome'
    `, [experimentId]);

    const counts = { a: { success: 0, fail: 0 }, b: { success: 0, fail: 0 } };
    for (const r of rows) {
      const v = r.variant as 'a' | 'b';
      const o = r.outcome as 'success' | 'fail';
      if ((v === 'a' || v === 'b') && (o === 'success' || o === 'fail')) {
        counts[v][o] = parseInt(r.count, 10);
      }
    }

    const totalA = counts.a.success + counts.a.fail;
    const totalB = counts.b.success + counts.b.fail;
    const rateA  = totalA > 0 ? counts.a.success / totalA : 0;
    const rateB  = totalB > 0 ? counts.b.success / totalB : 0;

    let winner: 'a' | 'b' | 'tie' | null = null;
    if (totalA >= 10 && totalB >= 10) {
      const diff = Math.abs(rateA - rateB);
      winner = diff < 0.05 ? 'tie' : (rateA > rateB ? 'a' : 'b');
    }

    return {
      variant_a: { success: counts.a.success, fail: counts.a.fail, rate: rateA },
      variant_b: { success: counts.b.success, fail: counts.b.fail, rate: rateB },
      winner,
      total:     totalA + totalB,
    };
  }
}
