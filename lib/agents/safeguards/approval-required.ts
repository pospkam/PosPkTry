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
      return { needs_approval: false };
    }

    // REVIEW — создать запись
    const expiresHours = action.expires_hours ?? 24;
    const { rows } = await pool.query<{ id: string }>(`
      INSERT INTO agent_approvals (action_type, description, context, requested_by, expires_at)
      VALUES ($1, $2, $3, $4, NOW() + ($5 || ' hours')::interval)
      RETURNING id
    `, [action.type, action.description, JSON.stringify(action.context), action.requested_by, expiresHours]);

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
    const chatId = process.env.TELEGRAM_CHAT_ID;
    if (!chatId) return;

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

    await telegramService.sendMessage({ chatId, text });
  }
}

export const approvalRequired = new ApprovalRequired();
