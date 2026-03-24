/**
 * SecurityAgency — AI-служба безопасности платформы.
 *
 * Мониторинг угроз, аномалий и подозрительной активности:
 *   sec_access_audit — аудит JWT аутентификации и подозрительных входов
 *   sec_anomaly      — аномалии в бронированиях и платежах
 *   sec_report       — полный отчёт о состоянии безопасности платформы
 */

import { pool } from '@/lib/db-pool';
import { callAIWaterfall } from '@/lib/ai/providers';
import type { AgentContext } from '../context-hub';
import type { ChatMessage } from '@/lib/ai/prompts';

export interface AgencyResult {
  response: string;
  data?: Record<string, unknown>;
}

interface AuthEventRow {
  action_type: string;
  hour: string;
  count: string;
  fail_rate: string;
}

interface AnomalyRow {
  booking_id: number;
  tour_title: string;
  operator: string;
  amount: number;
  created_at: string;
  anomaly_type: string;
}

interface SecuritySummaryRow {
  total_users: string;
  new_users_24h: string;
  failed_ops_24h: string;
  sos_events_7d: string;
  active_experiments: string;
  pending_approvals: string;
}

export class SecurityAgency {
  private briefing = '';
  private tools: Record<string, (...args: unknown[]) => Promise<{ success: boolean; message: string; details?: Record<string, unknown> }>> = {};

  async run(intent: string, context: AgentContext): Promise<AgencyResult> {
    this.briefing = context.richBriefing ?? '';
    this.tools = context.tools ?? {};
    switch (intent) {
      case 'sec_access_audit': return this.accessAudit();
      case 'sec_anomaly':      return this.detectAnomalies();
      case 'sec_report':       return this.fullReport();
      default:                 return { response: 'SecurityAgency: команда не поддерживается.' };
    }
  }

  /** Анализирует паттерны входов и подозрительную активность агентов */
  private async accessAudit(): Promise<AgencyResult> {
    // Enrich audit with external failed actions data (non-blocking)
    let failedActionsContext = '';
    if (this.tools.getFailedActions) {
      try {
        const result = await this.tools.getFailedActions(24);
        if (result.success) {
          failedActionsContext = result.message;
        }
      } catch { /* tool failure is non-blocking */ }
    }

    const [agentActivity, failedOps] = await Promise.all([
      // Активность агентной системы за 24ч по часам
      pool.query<AuthEventRow>(`
        SELECT
          action_type,
          date_trunc('hour', created_at)::text AS hour,
          COUNT(*)::text                        AS count,
          '0'::text                             AS fail_rate
        FROM ai_actions_log
        WHERE created_at >= NOW() - INTERVAL '24 hours'
          AND action_type NOT LIKE 'audit_%'
        GROUP BY action_type, date_trunc('hour', created_at)
        ORDER BY hour DESC, count DESC
        LIMIT 20
      `),

      // Неудачные операции за 24ч (ищем в metadata->>'status')
      pool.query<{ agent_name: string; intent: string; error_message: string; created_at: string }>(`
        SELECT
          COALESCE(metadata->>'agent_id', 'unknown') AS agent_name,
          COALESCE(metadata->>'tool', action_type)   AS intent,
          COALESCE(metadata->>'error', '')            AS error_message,
          created_at::text
        FROM ai_actions_log
        WHERE metadata->>'status' = 'error'
          AND created_at >= NOW() - INTERVAL '24 hours'
        ORDER BY created_at DESC
        LIMIT 10
      `),
    ]);

    const totalOps = agentActivity.rows.reduce((s, r) => s + parseInt(r.count, 10), 0);
    const failOps  = failedOps.rows.length;

    const lines: string[] = [
      '<b>Аудит доступа и активности агентов</b>',
      '',
      `Операций за 24ч: ${totalOps}`,
      `Ошибок: ${failOps}`,
    ];

    // Группируем по типам
    const byType: Record<string, number> = {};
    for (const r of agentActivity.rows) {
      byType[r.action_type] = (byType[r.action_type] ?? 0) + parseInt(r.count, 10);
    }
    if (Object.keys(byType).length > 0) {
      lines.push('', 'Активность по типам:');
      for (const [type, cnt] of Object.entries(byType).sort((a, b) => b[1] - a[1])) {
        lines.push(`• ${type}: ${cnt}`);
      }
    }

    if (failedOps.rows.length > 0) {
      lines.push('', 'Последние ошибки:');
      for (const e of failedOps.rows.slice(0, 5)) {
        const errShort = (e.error_message ?? 'нет данных').substring(0, 80);
        lines.push(`• [${e.agent_name}] ${e.intent} — ${errShort}`);
      }
    }

    const threatLevel = failOps > 10 ? 'ВЫСОКИЙ' : failOps > 3 ? 'СРЕДНИЙ' : 'НИЗКИЙ';
    lines.push('', `Уровень угроз: ${threatLevel}`);

    if (failedActionsContext) {
      lines.push('', `Внешний контекст: ${failedActionsContext}`);
    }

    // Emit anomaly event when suspicious pattern detected (>10 failures)
    if (this.tools.emitAnomaly && failOps > 10) {
      try {
        await this.tools.emitAnomaly('high_failure_rate', failOps, threatLevel);
      } catch { /* tool failure is non-blocking */ }
    }

    // Send critical security alert only for high threat level
    if (this.tools.sendSecurityAlert && threatLevel === 'ВЫСОКИЙ') {
      try {
        await this.tools.sendSecurityAlert(`Threat level: ${threatLevel}, failed ops: ${failOps}`);
      } catch { /* tool failure is non-blocking */ }
    }

    return {
      response: lines.join('\n'),
      data: { by_type: byType, failed_ops: failedOps.rows, threat_level: threatLevel },
    };
  }

  /** Выявляет аномалии в бронированиях и платежах */
  private async detectAnomalies(): Promise<AgencyResult> {
    const { rows } = await pool.query<AnomalyRow>(`
      WITH stats AS (
        SELECT
          AVG(final_price)    AS avg_amount,
          STDDEV(final_price) AS std_amount
        FROM operator_bookings
        WHERE deleted_at IS NULL
          AND final_price IS NOT NULL AND final_price > 0
          AND created_at >= NOW() - INTERVAL '30 days'
      ),
      flagged AS (
        SELECT
          ob.id             AS booking_id,
          ot.title          AS tour_title,
          p.name            AS operator,
          ob.final_price   AS amount,
          ob.created_at::text,
          CASE
            WHEN ob.final_price > (SELECT avg_amount + 3 * COALESCE(std_amount, 0) FROM stats)
                 THEN 'аномально высокая сумма'
            WHEN ob.final_price < 100 AND ob.final_price > 0
                 THEN 'подозрительно низкая сумма'
            WHEN ob.booking_status = 'confirmed'
                 AND (SELECT COUNT(*) FROM operator_bookings ob2
                       WHERE ob2.operator_tour_id IN (
                         SELECT id FROM operator_tours WHERE operator_id = ot.operator_id
                       )
                         AND ob2.created_at >= NOW() - INTERVAL '1 hour'
                     ) > 10
                 THEN 'массовые брони за 1 час'
            ELSE 'нет описания'
          END AS anomaly_type
        FROM operator_bookings ob
        JOIN operator_tours ot ON ot.id = ob.operator_tour_id
        JOIN partners p        ON p.id  = ot.operator_id
        WHERE ob.deleted_at IS NULL
          AND ob.created_at >= NOW() - INTERVAL '7 days'
        ORDER BY ob.created_at DESC
      )
      SELECT * FROM flagged
      WHERE anomaly_type != 'нет описания'
      LIMIT 15
    `);

    if (rows.length === 0) {
      return {
        response: 'Аномалий в бронированиях за последние 7 дней не выявлено. Система в норме.',
      };
    }

    if (this.tools.emitAnomaly && rows.length > 0) {
      this.tools.emitAnomaly({ count: rows.length, types: rows.map(a => a.anomaly_type) }).catch(() => {});
    }

    const lines: string[] = [
      `<b>Аномалии в бронированиях (7 дней): ${rows.length}</b>`,
      '',
    ];

    const byType = rows.reduce<Record<string, number>>((a, r) => {
      a[r.anomaly_type] = (a[r.anomaly_type] ?? 0) + 1;
      return a;
    }, {});

    for (const [t, c] of Object.entries(byType)) lines.push(`• ${t}: ${c}`);

    lines.push('', 'Детали:');
    for (const r of rows.slice(0, 8)) {
      const amt = r.amount ? `${Number(r.amount).toLocaleString('ru')} руб.` : '?';
      lines.push(`• #${r.booking_id} "${r.tour_title}" — ${r.anomaly_type} [${amt}]`);
    }

    return { response: lines.join('\n'), data: { anomalies: rows } };
  }

  /** Полный отчёт о безопасности платформы */
  private async fullReport(): Promise<AgencyResult> {
    const { rows } = await pool.query<SecuritySummaryRow>(`
      SELECT
        (SELECT COUNT(*)::text  FROM users)                                AS total_users,
        (SELECT COUNT(*)::text  FROM users
          WHERE created_at >= NOW() - INTERVAL '24 hours')                 AS new_users_24h,
        (SELECT COUNT(*)::text  FROM ai_actions_log
          WHERE metadata->>'status' = 'error'
            AND created_at >= NOW() - INTERVAL '24 hours')                 AS failed_ops_24h,
        (SELECT COUNT(*)::text  FROM sos_events
          WHERE created_at >= NOW() - INTERVAL '7 days')                   AS sos_events_7d,
        (SELECT COUNT(*)::text  FROM agent_experiments
          WHERE status = 'running')                                         AS active_experiments,
        (SELECT COUNT(*)::text  FROM agent_approvals
          WHERE status = 'pending'
            AND expires_at > NOW())                                         AS pending_approvals
    `);

    const s = rows[0];

    const lines: string[] = [
      '<b>Отчёт безопасности платформы</b>',
      '',
      `Пользователей: ${s.total_users} (новые 24ч: ${s.new_users_24h})`,
      `Ошибок агентов (24ч): ${s.failed_ops_24h}`,
      `SOS-событий (7 дней): ${s.sos_events_7d}`,
      `Активных A/B-тестов: ${s.active_experiments}`,
      `Ожидают подтверждения: ${s.pending_approvals}`,
    ];

    const aiComment = await this.callAI(
      `Дай краткую оценку безопасности туристической платформы Камчатка: ` +
      `новых пользователей 24ч: ${s.new_users_24h}, ошибок агентов: ${s.failed_ops_24h}, ` +
      `SOS-событий за 7 дней: ${s.sos_events_7d}. ` +
      `Ответ 2 предложения, только факты и рекомендации.`
    );

    if (aiComment) lines.push('', aiComment);

    return { response: lines.join('\n'), data: { summary: s } };
  }

  private async callAI(prompt: string): Promise<string | null> {
    try {
      const fullPrompt = this.briefing ? `${this.briefing}\n\n${prompt}` : prompt;
      const messages: ChatMessage[] = [{ role: 'user', content: fullPrompt }];
      return await callAIWaterfall(messages);
    } catch {
      return null;
    }
  }
}
