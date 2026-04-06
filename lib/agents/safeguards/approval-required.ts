/**
 * ApprovalRequired — очередь действий, требующих одобрения администратора.
 *
 * Safety categories (plan.md):
 *   SAFE (авто):    prompt_optimize, schedule_suggest, ui_copy_change
 *   NEED_REVIEW:    booking_rule_change, price_change, bulk_notify, commission_change
 *   FORBIDDEN:      data_delete, auth_bypass, schema_change, payment_exec
 *
 * Forbidden actions никогда не выполняются — возвращают ошибку.
 * Review actions создают pending запись в agent_approvals + Telegram уведомление.
 */

import { pool } from '@/lib/db-pool';
import { telegramService } from '@/lib/notifications/telegram';
import { auditLog } from './audit-log';

// ── Action categories ──────────────────────────────────────────────────────────

type ActionCategory = 'safe' | 'review' | 'forbidden';

const ACTION_CATEGORIES: Record<string, ActionCategory> = {
  // Safe — применяется автоматически
  prompt_optimize:     'safe',
  schedule_suggest:    'safe',
  ui_copy_change:      'safe',
  pattern_report:      'safe',
  code_change:         'safe',
  ab_scale_winner:     'safe',
  operator_outreach:   'safe',
  new_page_create:     'safe',
  sql_query_fix:       'safe',
  send_notification:   'safe',
  archive_sos:         'safe',
  tour_suspend:        'safe',
  operator_warning:    'safe',
  security_block:      'safe',
  zone_capacity:       'safe',
  flag_payment:        'safe',

  // Need review — требует одобрения admin
  booking_rule_change: 'review',
  price_change:        'review',
  bulk_notify:         'review',
  api_scope_expand:    'review',
  commission_change:   'review',
  tour_auto_cancel:    'review',
  ecosystem_proposal:  'review',

  // Forbidden — никогда не выполняется агентом
  data_delete:         'forbidden',
  auth_bypass:         'forbidden',
  schema_change:       'forbidden',
  payment_exec:        'forbidden',
  safeguard_modify:    'forbidden',
};

// ── Матрица исполнителей (из AGENTS.md) ───────────────────────────────────────
// Какой агент исполняет какой тип инициативы

const EXECUTOR_MAP: Record<string, { agent_id: string; agent_name: string }> = {
  booking_rule_change: { agent_id: 'admin',     agent_name: 'AI Администратор' },
  commission_change:   { agent_id: 'admin',     agent_name: 'AI Администратор' },
  bulk_notify:         { agent_id: 'admin',     agent_name: 'AI Администратор' },
  archive_sos:         { agent_id: 'rescue',    agent_name: 'AI Спасатель' },
  schedule_suggest:    { agent_id: 'rescue',    agent_name: 'AI Спасатель' },
  zone_capacity:       { agent_id: 'eco',       agent_name: 'AI Эколог' },
  tour_suspend:        { agent_id: 'quality',   agent_name: 'AI Качество' },
  operator_warning:    { agent_id: 'quality',   agent_name: 'AI Качество' },
  ui_copy_change:      { agent_id: 'content',   agent_name: 'AI Аудитор' },
  price_change:        { agent_id: 'hacker',    agent_name: 'AI Хакер' },
  ab_scale_winner:     { agent_id: 'hacker',    agent_name: 'AI Хакер' },
  operator_outreach:   { agent_id: 'hacker',    agent_name: 'AI Хакер' },
  sql_query_fix:       { agent_id: 'evo',       agent_name: 'AI Эволюция' },
  prompt_optimize:     { agent_id: 'evo',       agent_name: 'AI Эволюция' },
  code_change:         { agent_id: 'vibe_coder',agent_name: 'AI Разработчик' },
  new_page_create:     { agent_id: 'vibe_coder',agent_name: 'AI Разработчик' },
  security_block:      { agent_id: 'security',  agent_name: 'AI Безопасность' },
  api_scope_expand:    { agent_id: 'security',  agent_name: 'AI Безопасность' },
  flag_payment:        { agent_id: 'finance',   agent_name: 'AI Финдиректор' },
  send_notification:   { agent_id: 'admin',     agent_name: 'AI Администратор' },
  pattern_report:      { agent_id: 'evo',       agent_name: 'AI Эволюция' },
};

function getExecutor(actionType: string): { agent_id: string; agent_name: string } {
  return EXECUTOR_MAP[actionType] ?? { agent_id: 'admin', agent_name: 'AI Администратор' };
}

// ── Types ──────────────────────────────────────────────────────────────────────

export interface ApprovalAction {
  type: string;
  description: string;
  context: Record<string, unknown>;
  requested_by: string;
  expires_hours?: number;
}

export interface Approval {
  id:           string;
  action_type:  string;
  description:  string | null;
  context:      Record<string, unknown>;
  status:       'pending' | 'approved' | 'rejected' | 'expired';
  requested_by: string | null;
  reviewed_by:  number | null;
  reviewed_at:  Date | null;
  review_notes: string | null;
  expires_at:   Date | null;
  created_at:   Date;
}

export interface ApprovalRequestResult {
  needs_approval: boolean;
  id?:     string;
  reason?: string;
}

// ── ApprovalRequired ───────────────────────────────────────────────────────────

export class ApprovalRequired {
  /** Проверить категорию и создать запрос на одобрение (если нужно) */
  async request(action: ApprovalAction): Promise<ApprovalRequestResult> {
    const category = ACTION_CATEGORIES[action.type] ?? 'review';

    if (category === 'forbidden') {
      await auditLog.write({
        event_type: 'safeguard_blocked',
        actor:      action.requested_by,
        resource:   action.type,
        details:    { reason: 'forbidden_action', context: action.context },
      });
      return { needs_approval: true, reason: `Действие '${action.type}' запрещено системой` };
    }

    if (category === 'safe') {
      // Safe actions are auto-approved and immediately assigned to executor
      const expiresHours = action.expires_hours ?? 24;
      const executor = getExecutor(action.type);
      const { rows } = await pool.query<{ id: string }>(`
        INSERT INTO agent_approvals (
          action_type, description, context, status, requested_by,
          reviewed_at, review_notes, expires_at,
          executor_agent_id, executor_name, execution_status
        )
        VALUES ($1, $2, $3, 'approved', $4, NOW(), $5, NOW() + ($6 || ' hours')::interval, $7, $8, 'assigned')
        RETURNING id
      `, [
        action.type,
        action.description,
        JSON.stringify(action.context),
        action.requested_by,
        'auto_approved_safe_action',
        expiresHours,
        executor.agent_id,
        executor.agent_name,
      ]);

      const approvalId = rows[0]?.id;

      await auditLog.write({
        event_type: 'approval_granted',
        actor:      action.requested_by,
        resource:   action.type,
        details:    { approval_id: approvalId, category: 'safe', auto: true, executor: executor.agent_name },
      });

      return { needs_approval: false, id: approvalId };
    }

    // REVIEW — создать запись с исполнителем (но ждёт одобрения)
    const expiresHours = action.expires_hours ?? 24;
    const executor = getExecutor(action.type);
    const { rows } = await pool.query<{ id: string }>(`
      INSERT INTO agent_approvals (
        action_type, description, context, requested_by, expires_at,
        executor_agent_id, executor_name
      )
      VALUES ($1, $2, $3, $4, NOW() + ($5 || ' hours')::interval, $6, $7)
      RETURNING id
    `, [
      action.type,
      action.description,
      JSON.stringify(action.context),
      action.requested_by,
      expiresHours,
      executor.agent_id,
      executor.agent_name,
    ]);

    const approvalId = rows[0].id;

    await auditLog.write({
      event_type: 'approval_requested',
      actor:      action.requested_by,
      resource:   action.type,
      details:    { approval_id: approvalId, description: action.description },
    });

    await this.notifyAdmin(approvalId, action).catch(() => null);

    return { needs_approval: true, id: approvalId };
  }

  async approve(id: string, reviewerId: number, notes?: string): Promise<void> {
    await pool.query(`
      UPDATE agent_approvals
      SET status = 'approved', reviewed_by = $2, reviewed_at = NOW(), review_notes = $3
      WHERE id = $1 AND status = 'pending'
    `, [id, reviewerId, notes ?? null]);

    await auditLog.write({
      event_type: 'approval_granted',
      actor:      String(reviewerId),
      resource:   id,
      details:    { notes },
    });
  }

  async reject(id: string, reviewerId: number, notes?: string): Promise<void> {
    await pool.query(`
      UPDATE agent_approvals
      SET status = 'rejected', reviewed_by = $2, reviewed_at = NOW(), review_notes = $3
      WHERE id = $1 AND status = 'pending'
    `, [id, reviewerId, notes ?? null]);

    await auditLog.write({
      event_type: 'approval_rejected',
      actor:      String(reviewerId),
      resource:   id,
      details:    { notes },
    });
  }

  async pending(): Promise<Approval[]> {
    const { rows } = await pool.query<Approval>(`
      SELECT * FROM agent_approvals
      WHERE status = 'pending'
        AND (expires_at IS NULL OR expires_at > NOW())
      ORDER BY created_at ASC
      LIMIT 50
    `);
    return rows;
  }

  async expireStale(): Promise<number> {
    const { rowCount } = await pool.query(`
      UPDATE agent_approvals
      SET status = 'expired'
      WHERE status = 'pending'
        AND expires_at IS NOT NULL
        AND expires_at <= NOW()
    `);
    return rowCount ?? 0;
  }

  private async notifyAdmin(id: string, action: ApprovalAction): Promise<void> {
    // Отправляем в личку владельца (TELEGRAM_OWNER_ID), а не в группу
    const chatId = process.env.TELEGRAM_OWNER_ID ?? process.env.TELEGRAM_CHAT_ID;
    const token  = process.env.TELEGRAM_BOT_TOKEN;
    if (!chatId || !token) return;

    const shortId = id.slice(0, 8);
    const text = [
      '<b>Запрос на одобрение</b>',
      '',
      `Тип: <code>${action.type}</code>`,
      `Описание: ${action.description}`,
      `Запросил: ${action.requested_by}`,
      '',
      `/approve_${shortId} — одобрить`,
      `/reject_${shortId} — отклонить`,
    ].join('\n');

    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    }).catch(() => {});
  }
}

export const approvalRequired = new ApprovalRequired();
