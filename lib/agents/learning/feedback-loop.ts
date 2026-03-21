/**
 * FeedbackLoop — агрегирует пользовательскую оценку ответов агентов.
 *
 * Входные данные:  ai_actions_log WHERE action_type='agent_feedback'
 * Выходные данные: паттерны успеха/ошибок по интентам
 *
 * Используется AdminAgency.getDigest() для включения satisfaction метрик.
 */

import { pool } from '@/lib/db-pool';

export interface FeedbackPattern {
  intent: string;
  good_count: number;
  bad_count: number;
  total: number;
  satisfaction_rate: number; // 0-1
}

export interface FeedbackSummary {
  total_feedback: number;
  overall_satisfaction: number;
  patterns: FeedbackPattern[];
  worst_intent: string | null;
  best_intent: string | null;
}

interface FeedbackRow {
  intent: string;
  good_count: string;
  bad_count: string;
}

interface RecentFeedbackRow {
  metadata: { rating: string; intent?: string; comment?: string };
  created_at: Date;
}

export class FeedbackLoop {
  /** Агрегированный feedback по интентам за период */
  async getSummary(hours = 168): Promise<FeedbackSummary> {
    const { rows } = await pool.query<FeedbackRow>(`
      SELECT
        COALESCE(metadata->>'intent', 'unknown')                          AS intent,
        COUNT(*) FILTER (WHERE metadata->>'rating' = 'good')::text        AS good_count,
        COUNT(*) FILTER (WHERE metadata->>'rating' = 'bad')::text         AS bad_count
      FROM ai_actions_log
      WHERE action_type = 'agent_feedback'
        AND created_at >= NOW() - ($1 || ' hours')::interval
      GROUP BY COALESCE(metadata->>'intent', 'unknown')
      ORDER BY COUNT(*) DESC
    `, [hours]);

    const patterns: FeedbackPattern[] = rows.map(r => {
      const good  = parseInt(r.good_count, 10);
      const bad   = parseInt(r.bad_count, 10);
      const total = good + bad;
      return {
        intent:            r.intent,
        good_count:        good,
        bad_count:         bad,
        total,
        satisfaction_rate: total > 0 ? good / total : 1,
      };
    });

    const totalFeedback = patterns.reduce((s, p) => s + p.total, 0);
    const totalGood     = patterns.reduce((s, p) => s + p.good_count, 0);

    const sorted      = [...patterns].sort((a, b) => a.satisfaction_rate - b.satisfaction_rate);
    const worstIntent = sorted[0]?.satisfaction_rate < 0.75 ? sorted[0].intent : null;
    const bestIntent  = sorted[sorted.length - 1]?.intent ?? null;

    return {
      total_feedback:       totalFeedback,
      overall_satisfaction: totalFeedback > 0 ? totalGood / totalFeedback : 1,
      patterns,
      worst_intent:         worstIntent,
      best_intent:          bestIntent,
    };
  }

  /** Последние N отзывов */
  async getRecent(limit = 20): Promise<Array<{
    rating: string;
    intent: string;
    comment?: string;
    created_at: Date;
  }>> {
    const { rows } = await pool.query<RecentFeedbackRow>(`
      SELECT metadata, created_at
      FROM ai_actions_log
      WHERE action_type = 'agent_feedback'
      ORDER BY created_at DESC
      LIMIT $1
    `, [limit]);

    return rows.map(r => ({
      rating:     r.metadata.rating,
      intent:     r.metadata.intent ?? 'unknown',
      comment:    r.metadata.comment,
      created_at: r.created_at,
    }));
  }
}
