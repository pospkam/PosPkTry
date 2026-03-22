/**
 * Execution Tracker
 *
 * Следит за исполнением инициатив, выданных советом директоров.
 * Предоставляет данные для pre-meeting briefing и accountability reports.
 */

import { pool } from '@/lib/db-pool';
import type { AgentApproval } from '../types/agent-approvals';

export interface ExecutionStatus {
  initiative_id: string;
  from_agent_id: string;
  title: string;
  decision_at: Date;
  assigned_to?: string;
  execution_status: 'assigned' | 'in_progress' | 'done' | 'failed' | 'blocked';
  started_at?: Date | null;
  completed_at?: Date | null;
  failure_reason?: string | null;
  progress_pct: number;  /* 0-100 */
  days_elapsed: number;
}

export class ExecutionTracker {
  /**
   * Получить статус последних инициатив для pre-meeting briefing
   */
  static async getLastMeetingInitiatives(): Promise<ExecutionStatus[]> {
    const query = `
      -- Last meeting initiatives with execution status
      SELECT
        aa.id as initiative_id,
        aa.context->>'from_agent' as from_agent_id,
        aa.description as title,
        aa.created_at as decision_at,
        aa.context->>'assigned_to' as assigned_to,
        COALESCE(aa.context->>'execution_status', 'assigned')::text as execution_status,
        aa.context->>'started_at' as started_at,
        aa.context->>'completed_at' as completed_at,
        aa.context->>'failure_reason' as failure_reason,
        COALESCE((aa.context->>'progress_pct')::int, 0) as progress_pct,
        EXTRACT(DAY FROM NOW() - aa.created_at)::int as days_elapsed
      FROM agent_approvals aa
      WHERE aa.type IN ('initiative', 'board_proposal')
        AND aa.created_at > NOW() - INTERVAL '7 days'
      ORDER BY aa.created_at DESC
      LIMIT 20
    `;

    try {
      const result = await pool.query(query);
      return result.rows.map((row: any) => ({
        initiative_id: row.initiative_id,
        from_agent_id: row.from_agent_id,
        title: row.title,
        decision_at: row.decision_at,
        assigned_to: row.assigned_to,
        execution_status: row.execution_status as ExecutionStatus['execution_status'],
        started_at: row.started_at ? new Date(row.started_at) : null,
        completed_at: row.completed_at ? new Date(row.completed_at) : null,
        failure_reason: row.failure_reason,
        progress_pct: row.progress_pct,
        days_elapsed: row.days_elapsed,
      }));
    } catch (err) {
      console.error('[ExecutionTracker] Failed to fetch initiatives:', err);
      return [];
    }
  }

  /**
   * Получить инициативы, которые не исполнены за более чем N дней
   */
  static async getOverdueInitiatives(daysThreshold: number = 3): Promise<ExecutionStatus[]> {
    const initiatives = await this.getLastMeetingInitiatives();
    return initiatives.filter(
      i => i.execution_status !== 'done' &&
           i.days_elapsed > daysThreshold &&
           i.execution_status !== 'blocked'
    );
  }

  /**
   * Обновить статус исполнения инициативы
   */
  static async updateExecutionStatus(
    initiativeId: string,
    status: ExecutionStatus['execution_status'],
    metadata?: {
      progress_pct?: number;
      failure_reason?: string;
      notes?: string;
    }
  ): Promise<void> {
    try {
      const context = {
        execution_status: status,
        updated_at: new Date().toISOString(),
        progress_pct: metadata?.progress_pct ?? 0,
        failure_reason: metadata?.failure_reason ?? null,
        notes: metadata?.notes ?? null,
      };

      await pool.query(
        `UPDATE agent_approvals
         SET context = jsonb_set(context, '{execution_status}', $1::jsonb)
         WHERE id = $2`,
        [JSON.stringify(context), initiativeId]
      );
    } catch (err) {
      console.error('[ExecutionTracker] Failed to update status:', err);
    }
  }

  /**
   * Начать выполнение инициативы (started_at)
   */
  static async startExecution(initiativeId: string): Promise<void> {
    await this.updateExecutionStatus(initiativeId, 'in_progress', {
      progress_pct: 10,
    });
  }

  /**
   * Завершить инициативу успешно
   */
  static async completeExecution(initiativeId: string, notes?: string): Promise<void> {
    await this.updateExecutionStatus(initiativeId, 'done', {
      progress_pct: 100,
      notes,
    });
  }

  /**
   * Отметить инициативу как ошибка
   */
  static async failExecution(initiativeId: string, reason: string): Promise<void> {
    await this.updateExecutionStatus(initiativeId, 'failed', {
      failure_reason: reason,
      progress_pct: 0,
    });
  }

  /**
   * Отметить как заблокированную (ожидает других решений)
   */
  static async blockExecution(initiativeId: string, reason: string): Promise<void> {
    await this.updateExecutionStatus(initiativeId, 'blocked', {
      failure_reason: reason,
    });
  }

  /**
   * Сформировать отчёт для pre-meeting briefing
   */
  static async generatePreMeetingBriefing(): Promise<string> {
    const initiatives = await this.getLastMeetingInitiatives();
    const overdue = initiatives.filter(i => i.days_elapsed > 3 && i.execution_status !== 'done');

    if (initiatives.length === 0) {
      return '✅ Предыдущих инициатив нет. Чистый лист.';
    }

    const completed = initiatives.filter(i => i.execution_status === 'done').length;
    const inProgress = initiatives.filter(i => i.execution_status === 'in_progress').length;
    const failed = initiatives.filter(i => i.execution_status === 'failed').length;
    const blocked = initiatives.filter(i => i.execution_status === 'blocked').length;

    let briefing = `📊 СТАТУС ИНИЦИАТИВ (последние 7 дней)\n\n`;
    briefing += `✅ Завершено: ${completed}/${initiatives.length}\n`;
    briefing += `⏳ В процессе: ${inProgress}\n`;
    briefing += `❌ Ошибки: ${failed}\n`;
    briefing += `🚫 Заблокировано: ${blocked}\n\n`;

    if (overdue.length > 0) {
      briefing += `⚠️ ПРОСРОЧЕННЫЕ (более 3 дней, не выполнены):\n`;
      for (const i of overdue.slice(0, 5)) {
        briefing += `  • [${i.days_elapsed}d] ${i.title}\n`;
        briefing += `    Статус: ${i.execution_status} | Агент: ${i.from_agent_id}\n`;
      }
      briefing += '\n';
    }

    briefing += `💡 ДИРЕКТОРУ НУЖНО: разобраться с просроченными инициативами перед следующим совещанием.`;

    return briefing;
  }

  /**
   * Отчёт для Round 0.5 (перед отчётами агентов)
   */
  static async getAccountabilityReport(): Promise<{
    total_initiatives: number;
    completed_pct: number;
    overdue_count: number;
    failed_count: number;
    blocked_count: number;
    details: ExecutionStatus[];
  }> {
    const initiatives = await this.getLastMeetingInitiatives();
    const completed = initiatives.filter(i => i.execution_status === 'done').length;
    const overdue = initiatives.filter(i => i.days_elapsed > 3 && i.execution_status !== 'done').length;
    const failed = initiatives.filter(i => i.execution_status === 'failed').length;
    const blocked = initiatives.filter(i => i.execution_status === 'blocked').length;

    return {
      total_initiatives: initiatives.length,
      completed_pct: initiatives.length > 0 ? Math.round((completed / initiatives.length) * 100) : 0,
      overdue_count: overdue,
      failed_count: failed,
      blocked_count: blocked,
      details: initiatives,
    };
  }
}
