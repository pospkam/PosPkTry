/**
 * InfraAgency — AI-DevOps / SRE агент туристической платформы.
 *
 * Мониторинг инфраструктуры и здоровья системы:
 *   infra_health — ошибки API, AI-провайдеры, выполнение агентов, БД
 *   infra_crons  — статус cron-задач и последних запусков
 */

import { pool } from '@/lib/db-pool';
import { callAIWaterfall } from '@/lib/ai/providers';
import type { AgentContext } from '../context-hub';

export interface AgencyResult {
  response: string;
  data?: Record<string, unknown>;
}

// ── Типы строк БД ─────────────────────────────────────────────────────────────

interface AICallStatsRow {
  action_type: string;
  call_count: string;
  providers_used: string;
  total_tokens_in: string;
  total_tokens_out: string;
  total_cost_usd: string;
  last_call: string;
}

interface AgentActionStatsRow {
  status: string;
  count: string;
  last_seen: string;
}

interface ExecutionStatsRow {
  execution_status: string;
  count: string;
  last_seen: string;
}

interface MeetingStatsRow {
  status: string;
  count: string;
  last_started: string;
  avg_proposals: string;
}

// ── InfraAgency ────────────────────────────────────────────────────────────────

export class InfraAgency {
  private briefing = '';
  private tools: Record<string, (...args: unknown[]) => Promise<{ success: boolean; message: string; details?: Record<string, unknown> }>> = {};

  async run(intent: string, context: AgentContext): Promise<AgencyResult> {
    this.briefing = context.richBriefing ?? '';
    this.tools = context.tools ?? {};
    switch (intent) {
      case 'infra_health': return this.healthReport();
      case 'infra_crons':  return this.cronReport();
      default:             return { response: 'InfraAgency: команда не поддерживается.' };
    }
  }

  // ── Отчёт о здоровье системы ──────────────────────────────────────────────

  private async healthReport(): Promise<AgencyResult> {
    try {
      const dbStart = Date.now();

      const [aiStats, agentActions, execStats, meetingStats, dbPing] = await Promise.all([
        // AI-вызовы за 24 часа по типам (стоимость, провайдеры)
        pool.query<AICallStatsRow>(`
          SELECT
            action_type,
            COUNT(*)::text                                 AS call_count,
            STRING_AGG(DISTINCT provider, ', ')           AS providers_used,
            COALESCE(SUM(tokens_in), 0)::text             AS total_tokens_in,
            COALESCE(SUM(tokens_out), 0)::text            AS total_tokens_out,
            COALESCE(SUM(cost_usd), 0)::text              AS total_cost_usd,
            MAX(created_at)::text                         AS last_call
          FROM ai_actions_log
          WHERE created_at >= NOW() - INTERVAL '24 hours'
          GROUP BY action_type
          ORDER BY COUNT(*) DESC
          LIMIT 10
        `),

        // Статус автономных действий агентов (067: agent_actions)
        pool.query<AgentActionStatsRow>(`
          SELECT
            status,
            COUNT(*)::text AS count,
            MAX(created_at)::text AS last_seen
          FROM agent_actions
          WHERE created_at >= NOW() - INTERVAL '24 hours'
          GROUP BY status
          ORDER BY COUNT(*) DESC
        `).catch(() => ({ rows: [] as AgentActionStatsRow[] })),

        // Статус исполнения инициатив
        pool.query<ExecutionStatsRow>(`
          SELECT
            execution_status,
            COUNT(*)::text AS count,
            MAX(updated_at)::text AS last_seen
          FROM agent_approvals
          WHERE updated_at >= NOW() - INTERVAL '7 days'
          GROUP BY execution_status
          ORDER BY COUNT(*) DESC
        `).catch(() => ({ rows: [] as ExecutionStatsRow[] })),

        // Статистика совещаний (последние 10)
        pool.query<MeetingStatsRow>(`
          SELECT
            status,
            COUNT(*)::text AS count,
            MAX(started_at)::text AS last_started,
            AVG(proposals_count)::text AS avg_proposals
          FROM board_meeting_sessions
          WHERE started_at >= NOW() - INTERVAL '30 days'
          GROUP BY status
        `).catch(() => ({ rows: [] as MeetingStatsRow[] })),

        // Контрольный замер скорости БД
        pool.query<{ ping_ms: string }>(`
          SELECT EXTRACT(MILLISECONDS FROM (clock_timestamp() - NOW()))::text AS ping_ms
        `),
      ]);

      const dbMs = Date.now() - dbStart;

      const data = {
        ai_calls:       aiStats.rows,
        agent_actions:  agentActions.rows,
        exec_stats:     execStats.rows,
        meeting_stats:  meetingStats.rows,
        db_response_ms: dbMs,
      };

      // Вычисляем метрики для AI-анализа
      const totalAICalls = aiStats.rows.reduce((s, r) => s + parseInt(r.call_count, 10), 0);
      const totalAICost  = aiStats.rows.reduce((s, r) => s + parseFloat(r.total_cost_usd), 0);

      const failedExec = execStats.rows.find(r => r.execution_status === 'failed');
      const doneExec   = execStats.rows.find(r => r.execution_status === 'done');
      const failedMeet = meetingStats.rows.find(r => r.status === 'failed');

      // Toolkit enrichment (non-blocking)
      let providerStatus = '';
      let cronToolStatus = '';
      try {
        if (this.tools.probeAIProviders) {
          const probe = await this.tools.probeAIProviders();
          providerStatus = probe.message;
          if (!probe.success && this.tools.sendInfraAlert) {
            await this.tools.sendInfraAlert('ai_providers_unreachable', probe.message);
          }
        }
      } catch { /* non-blocking */ }
      try {
        if (this.tools.getCronStatus) {
          const cronRes = await this.tools.getCronStatus();
          cronToolStatus = cronRes.message;
        }
      } catch { /* non-blocking */ }

      const prompt = [
        'Ты DevOps/SRE инженер туристической платформы Камчатки.',
        'Данные за последние 24 часа. Дай честный технический анализ:',
        '',
        'БАЗА ДАННЫХ:',
        `  Время ответа (последний запрос): ${dbMs} мс`,
        '',
        'AI-ВЫЗОВЫ (24ч):',
        `  Всего вызовов: ${totalAICalls}`,
        `  Примерная стоимость: ${totalAICost.toFixed(4)} USD`,
        aiStats.rows.slice(0, 5).map(r =>
          `  ${r.action_type}: ${r.call_count} вызовов (${r.providers_used})`
        ).join('\n') || '  нет данных',
        '',
        'ИСПОЛНЕНИЕ ИНИЦИАТИВ (7 дней):',
        execStats.rows.map(r => `  ${r.execution_status}: ${r.count}`).join('\n') || '  нет данных',
        failedExec ? `  ВНИМАНИЕ: ${failedExec.count} провалившихся инициатив` : '',
        '',
        'СОВЕЩАНИЯ (30 дней):',
        meetingStats.rows.map(r => `  ${r.status}: ${r.count} (ср. ${parseFloat(r.avg_proposals || '0').toFixed(1)} предложений)`).join('\n') || '  нет данных',
        failedMeet ? `  ВНИМАНИЕ: ${failedMeet.count} упавших совещаний` : '',
        providerStatus ? `\nAI-ПРОВАЙДЕРЫ (probe):\n  ${providerStatus}` : '',
        cronToolStatus ? `\nCRON (toolkit):\n  ${cronToolStatus}` : '',
        '',
        'Правила:',
        '1. Только факты из данных выше',
        '2. Назови конкретные числа при рисках',
        '3. Если всё ок — скажи это прямо',
        '4. confidence: high/medium/low',
      ].filter(Boolean).join('\n');

      const fullPrompt = this.briefing ? `${this.briefing}\n\n${prompt}` : prompt;
      const aiText = await callAIWaterfall([{ role: 'user', content: fullPrompt }]);

      const statusIcon = dbMs < 200
        ? (failedExec && parseInt(failedExec.count, 10) > 2 ? 'ПРЕДУПРЕЖДЕНИЕ' : 'ОК')
        : 'МЕДЛЕННО';

      const date = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
      const response = [
        `<b>Инфраструктура — ${date} [${statusIcon}]</b>`,
        `БД: ${dbMs} мс | AI-вызовы: ${totalAICalls} | Стоимость: $${totalAICost.toFixed(4)}`,
        '',
        aiText ?? `БД: ${dbMs} мс. AI-вызовов: ${totalAICalls}. Подробности недоступны.`,
      ].join('\n');

      return { response, data };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return {
        response: `<b>Инфраструктура — ошибка</b>\n\n${msg}`,
        data: {},
      };
    }
  }

  // ── Отчёт по cron-задачам ──────────────────────────────────────────────────

  private async cronReport(): Promise<AgencyResult> {
    try {
      // Смотрим последние AI-активности в разрезе типов как прокси для cron
      const rows = await pool.query<{
        action_type: string;
        last_run: string;
        hours_ago: string;
        run_count_today: string;
      }>(`
        SELECT
          action_type,
          MAX(created_at)::text                                              AS last_run,
          EXTRACT(HOURS FROM (NOW() - MAX(created_at)))::text               AS hours_ago,
          COUNT(*) FILTER (WHERE created_at >= NOW() - INTERVAL '24 hours')::text AS run_count_today
        FROM ai_actions_log
        GROUP BY action_type
        ORDER BY MAX(created_at) DESC
        LIMIT 15
      `);

      const stale = rows.rows.filter(r => parseFloat(r.hours_ago) > 25);

      const lines = rows.rows.map(r =>
        `  ${r.action_type}: ${r.run_count_today}х сегодня (последний ${parseFloat(r.hours_ago).toFixed(0)}ч назад)`
      ).join('\n') || '  нет активности';

      const response = [
        '<b>Cron / AI-активность (24ч)</b>',
        '',
        lines,
        stale.length > 0 ? `\nВозможно устаревшие (>25ч): ${stale.map(r => r.action_type).join(', ')}` : '',
      ].filter(Boolean).join('\n');

      return { response, data: { tasks: rows.rows, stale_count: stale.length } };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { response: `Cron отчёт недоступен: ${msg}`, data: {} };
    }
  }
}
