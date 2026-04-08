/**
 * PatternRecognition — анализирует паттерны успеха/ошибок из observation log.
 *
 * Находит: медленные интенты, высокий error rate, популярные запросы.
 * Возвращает actionable insights для включения в /health и /digest.
 */

import { pool } from '@/lib/db-pool';

export interface IntentMetrics {
  intent: string;
  count: number;
  success_rate: number;
  avg_duration_ms: number;
  p95_duration_ms: number;
  error_rate: number;
}

export type PatternSeverity = 'critical' | 'warning' | 'info';
export type PatternType = 'slow_intent' | 'failing_intent' | 'high_usage';

export interface SystemPattern {
  pattern_type:   PatternType;
  intent:         string;
  description:    string;
  recommendation: string;
  severity:       PatternSeverity;
}

interface MetricsRow {
  decision:      string;
  count:         string;
  success_count: string;
  fail_count:    string;
  avg_ms:        string;
  p95_ms:        string | null;
}

const SEVERITY_ORDER: Record<PatternSeverity, number> = { critical: 0, warning: 1, info: 2 };

/**
 * Порог latency зависит от типа интента:
 * - mtg_* — целые заседания совета (13 агентов параллельно), норма 60-120с
 * - admin_digest — дайджест, допускается до 30с
 * - все остальные — API/агентные вызовы, цель <5с
 */
function getThresholdMs(intent: string): number {
  if (intent.startsWith('mtg_'))      return 180_000; // 3 минуты
  if (intent === 'admin_digest')      return 30_000;  // 30 секунд
  return 5_000;
}

function getThresholdLabel(intent: string): string {
  const ms = getThresholdMs(intent);
  if (ms >= 60_000) return `${ms / 60_000} мин`;
  return `${ms / 1_000}с`;
}

export class PatternRecognition {
  async analyzeIntents(hours = 24): Promise<IntentMetrics[]> {
    const { rows } = await pool.query<MetricsRow>(`
      SELECT
        metadata->>'decision'                                          AS decision,
        COUNT(*)::text                                                 AS count,
        COUNT(*) FILTER (WHERE metadata->>'result' = 'success')::text AS success_count,
        COUNT(*) FILTER (WHERE metadata->>'result' = 'fail')::text    AS fail_count,
        AVG((metadata->>'duration_ms')::numeric)::text                AS avg_ms,
        PERCENTILE_CONT(0.95) WITHIN GROUP (
          ORDER BY (metadata->>'duration_ms')::numeric
        )::text                                                        AS p95_ms
      FROM ai_actions_log
      WHERE action_type LIKE 'agent_%'
        AND action_type NOT IN ('agent_feedback', 'agent_experiment_result')
        AND created_at >= NOW() - ($1 || ' hours')::interval
        AND metadata->>'decision' IS NOT NULL
        AND metadata->>'decision' != 'unknown'
      GROUP BY metadata->>'decision'
      ORDER BY COUNT(*) DESC
    `, [hours]);

    return rows.map(r => {
      const count   = parseInt(r.count, 10);
      const success = parseInt(r.success_count, 10);
      const fail    = parseInt(r.fail_count, 10);
      return {
        intent:          r.decision,
        count,
        success_rate:    count > 0 ? success / count : 1,
        avg_duration_ms: Math.round(parseFloat(r.avg_ms ?? '0')),
        p95_duration_ms: Math.round(parseFloat(r.p95_ms ?? '0')),
        error_rate:      count > 0 ? fail / count : 0,
      };
    });
  }

  async detectPatterns(hours = 24): Promise<SystemPattern[]> {
    const metrics  = await this.analyzeIntents(hours);
    const patterns: SystemPattern[] = [];

    for (const m of metrics) {
      const thresholdMs = getThresholdMs(m.intent);
      if (m.p95_duration_ms > thresholdMs) {
        patterns.push({
          pattern_type:   'slow_intent',
          intent:         m.intent,
          description:    `${m.intent}: p95 = ${m.p95_duration_ms}ms (порог ${getThresholdLabel(m.intent)})`,
          recommendation: m.intent.startsWith('mtg_')
            ? 'Норма для заседания совета — проверь только если >3 мин'
            : 'Добавь кэш или оптимизируй SQL-запрос',
          severity:       m.p95_duration_ms > thresholdMs * 2 ? 'critical' : 'warning',
        });
      }

      if (m.error_rate > 0.2 && m.count >= 3) {
        patterns.push({
          pattern_type:   'failing_intent',
          intent:         m.intent,
          description:    `${m.intent}: ошибок ${Math.round(m.error_rate * 100)}% из ${m.count} вызовов`,
          recommendation: `Проверь логи для ${m.intent} в /hub/admin/agents`,
          severity:       m.error_rate > 0.5 ? 'critical' : 'warning',
        });
      }

      if (m.count >= 10) {
        patterns.push({
          pattern_type:   'high_usage',
          intent:         m.intent,
          description:    `${m.intent}: ${m.count} вызовов за ${hours}ч (популярный)`,
          recommendation: 'Приоритет для A/B тестирования и кэширования',
          severity:       'info',
        });
      }
    }

    return patterns.sort((a, b) => SEVERITY_ORDER[a.severity] - SEVERITY_ORDER[b.severity]);
  }

  /** Краткое текстовое резюме — для /digest и /health */
  async buildInsightText(hours = 24): Promise<string | null> {
    const patterns  = await this.detectPatterns(hours);
    const critical  = patterns.filter(p => p.severity === 'critical');
    const warnings  = patterns.filter(p => p.severity === 'warning');

    const lines: string[] = [];
    if (critical.length > 0) {
      lines.push(`Критично (${critical.length}): ${critical.map(p => p.description).join('; ')}`);
    }
    if (warnings.length > 0) {
      lines.push(`Предупр. (${warnings.length}): ${warnings.map(p => p.description).join('; ')}`);
    }

    return lines.length > 0 ? lines.join('\n') : null;
  }
}
