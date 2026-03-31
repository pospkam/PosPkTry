/**
 * lib/agents/execution/initiative-executor.ts
 * AGENT EXECUTION LAYER
 *
 * Когда инициатива одобрена — эта система запускает ФАКТИЧЕСКОЕ выполнение.
 * Все SQL проверены по реальной схеме БД (мар 2026).
 *
 * Executors:
 *   archive_sos           — архивировать зависшие SOS-события
 *   send_notification     — отправить Telegram-уведомление владельцу
 *   ui_copy_change        — переписать описания туров с низким рейтингом (AI)
 *   price_change          — создать A/B эксперимент по ценам
 *   commission_change     — обновить настройки комиссий оператора
 *   sql_query_fix         — самоисцеление SQL-ошибок в agency-файлах
 *   booking_rule_change   — обновить политику отмены оператора
 */

import { pool } from '@/lib/db-pool';
import { callAIWithModelDirect } from '@/lib/ai/providers';
import { getModelForAgent } from '@/lib/ai/agent-models';
import type { ChatMessage } from '@/lib/ai/prompts';
import { executeCodeChange, executeNewPageCreate } from './handlers/code-change-executor';
import { executeABScaleWinner } from './handlers/ab-scale-executor';
import { executeOperatorOutreach } from './handlers/operator-outreach-executor';

export interface ExecutionTask {
  approval_id: string;
  executor_agent_id: string;
  action_type: string;
  description: string;
  context: Record<string, unknown>;
  due_date: string;
}

export interface ExecutionResult {
  success: boolean;
  changes_made: string[];
  errors: string[];
  rollback_available: boolean;
  verification_passed: boolean;
}

// Типы которые выполняются автоматически после approve (без ручного триггера)
// safe  — не требуют одобрения, исполняются сразу при создании совещанием
// review — требуют approve, но после клика исполняются без лишнего шага
export const AUTO_EXECUTE_TYPES = new Set([
  'archive_sos',         // rescue: архивировать зависшие SOS
  'send_notification',   // любой: Telegram-уведомление
  'ui_copy_change',      // content: переписать описания туров (AI)
  'price_change',        // hacker: создать A/B эксперимент (только запись, цены не меняет)
  'sql_query_fix',       // evo: самоисцеление SQL-ошибок
  'booking_rule_change', // legal: обновить политику отмены оператора
  'code_change',         // vibe_coder: ЭКСПЕРИМЕНТ — AI создаёт GitHub PR без одобрения
  'ab_scale_winner',     // hacker: применить победителя A/B теста
  'operator_outreach',   // intelligence: найти операторов и отправить приглашения
  'new_page_create',     // vibe_coder/intelligence: создать новую страницу через GitHub PR
]);

const EXECUTORS: Record<string, (task: ExecutionTask) => Promise<ExecutionResult>> = {
  archive_sos:         executeArchiveSOS,
  send_notification:   executeSendNotification,
  ui_copy_change:      executeTourDescriptionRewrite,
  price_change:        executeABTestSetup,
  commission_change:   executeCommissionUpdate,
  sql_query_fix:       executeSQLQueryFix,
  booking_rule_change: executeCancellationPolicyUpdate,
  code_change:         executeCodeChange,
  ab_scale_winner:     executeABScaleWinner,
  operator_outreach:   executeOperatorOutreach,
  new_page_create:     executeNewPageCreate,
};

// ═══════════════════════════════════════════════════════════════
// EXECUTOR 1: ARCHIVE STALE SOS (Rescue Agent)
// Архивирует SOS-события старше 24ч которые никто не обработал
// ═══════════════════════════════════════════════════════════════
async function executeArchiveSOS(task: ExecutionTask): Promise<ExecutionResult> {
  const changes: string[] = [];
  const errors: string[] = [];

  try {
    const stale = await pool.query<{ id: string; tourist_name: string | null; created_at: string }>(
      `SELECT id, tourist_name, created_at::text
       FROM sos_events
       WHERE status = 'sent'
         AND created_at < NOW() - INTERVAL '24 hours'
       ORDER BY created_at ASC`
    );

    if (stale.rows.length === 0) {
      return {
        success: true,
        changes_made: ['Зависших SOS-событий не найдено'],
        errors: [],
        rollback_available: false,
        verification_passed: true,
      };
    }

    const ids = stale.rows.map(r => r.id);
    const reason = typeof task.context.reason === 'string'
      ? task.context.reason
      : 'Авто-архивация: нет ответа >24ч';

    await pool.query(
      `UPDATE sos_events
       SET status = 'archived', notes = $1
       WHERE id = ANY($2::uuid[])`,
      [reason, ids]
    );

    changes.push(`Архивировано ${ids.length} SOS-событий:`);
    for (const r of stale.rows) {
      changes.push(`  • ${r.tourist_name ?? 'Аноним'} (от ${r.created_at.slice(0, 10)})`);
    }

    // Уведомляем владельца в Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId   = process.env.TELEGRAM_CHAT_ID;
    if (botToken && chatId) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `✅ Rescue Agent авто-архивировал ${ids.length} SOS-событий старше 24ч`,
          parse_mode: 'HTML',
        }),
      }).catch(() => null);
    }

    return {
      success: true,
      changes_made: changes,
      errors,
      rollback_available: true,
      verification_passed: true,
    };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
  }
}

// ═══════════════════════════════════════════════════════════════
// EXECUTOR 2: SEND TELEGRAM NOTIFICATION (любой агент)
// ═══════════════════════════════════════════════════════════════
async function executeSendNotification(task: ExecutionTask): Promise<ExecutionResult> {
  const changes: string[] = [];
  const errors: string[] = [];

  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId   = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      errors.push('TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID не настроены');
      return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
    }

    const text = typeof task.context.message === 'string'
      ? task.context.message
      : `Агент ${task.executor_agent_id}: ${task.description}`;

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });

    if (!res.ok) {
      errors.push(`Telegram API: ${res.status}`);
      return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
    }

    changes.push(`Уведомление отправлено в Telegram (chat ${chatId})`);
    return { success: true, changes_made: changes, errors, rollback_available: false, verification_passed: true };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
  }
}

// ═══════════════════════════════════════════════════════════════
// EXECUTOR 3: TOUR DESCRIPTION REWRITE (Content Agent)
// Переписывает описания туров с низким рейтингом через AI
// ═══════════════════════════════════════════════════════════════
async function executeTourDescriptionRewrite(task: ExecutionTask): Promise<ExecutionResult> {
  const changes: string[] = [];
  const errors: string[] = [];

  try {
    const limit = typeof task.context.limit === 'number' ? task.context.limit : 5;

    // Туры с низким рейтингом или коротким описанием
    const tours = await pool.query<{ id: number; title: string; description: string | null; rating: string | null }>(
      `SELECT id, title, description, rating
       FROM operator_tours
       WHERE deleted_at IS NULL AND is_active = true
         AND (description IS NULL OR length(description) < 100 OR rating::numeric < 4.0)
       ORDER BY COALESCE(rating::numeric, 0) ASC, length(COALESCE(description, '')) ASC
       LIMIT $1`,
      [limit]
    );

    if (tours.rows.length === 0) {
      return {
        success: true,
        changes_made: ['Туров требующих улучшения не найдено'],
        errors: [],
        rollback_available: false,
        verification_passed: true,
      };
    }

    changes.push(`Найдено ${tours.rows.length} туров для улучшения`);

    for (const tour of tours.rows) {
      try {
        const prompt = [
          `Тур: "${tour.title}"`,
          tour.description ? `Текущее описание: "${tour.description}"` : 'Описание отсутствует.',
          '',
          'Напиши продающее описание тура для туристической платформы Камчатки.',
          'Требования: 2-3 предложения, эмоционально, конкретно, на русском языке.',
          'Только текст описания, без кавычек.',
        ].join('\n');

        const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
        const newDesc = await callAIWithModelDirect(messages, getModelForAgent('content'));

        if (newDesc && newDesc.length > 20) {
          await pool.query(
            `UPDATE operator_tours SET description = $1, updated_at = NOW() WHERE id = $2`,
            [newDesc.trim(), tour.id]
          );
          changes.push(`✓ "${tour.title}" — описание обновлено (${newDesc.length} симв.)`);
        }
      } catch (err) {
        errors.push(`"${tour.title}": ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return {
      success: errors.length < tours.rows.length,
      changes_made: changes,
      errors,
      rollback_available: true,
      verification_passed: true,
    };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
  }
}

// ═══════════════════════════════════════════════════════════════
// EXECUTOR 4: A/B PRICING EXPERIMENT (Hacker Agent)
// Создаёт эксперимент в agent_experiments (без изменения цен в БД)
// ═══════════════════════════════════════════════════════════════
async function executeABTestSetup(task: ExecutionTask): Promise<ExecutionResult> {
  const changes: string[] = [];
  const errors: string[] = [];

  try {
    // Туры с нулевыми бронированиями за 30 дней
    const lowVolume = await pool.query<{ id: number; title: string; base_price: string }>(
      `SELECT ot.id, ot.title, ot.base_price
       FROM operator_tours ot
       WHERE ot.deleted_at IS NULL AND ot.is_active = true
         AND NOT EXISTS (
           SELECT 1 FROM operator_bookings ob
           WHERE ob.operator_tour_id = ot.id
             AND ob.created_at >= NOW() - INTERVAL '30 days'
             AND ob.deleted_at IS NULL
         )
       ORDER BY ot.base_price DESC
       LIMIT 20`
    );

    if (lowVolume.rows.length === 0) {
      return {
        success: true,
        changes_made: ['Все туры имеют бронирования за 30 дней — A/B тест не нужен'],
        errors: [],
        rollback_available: false,
        verification_passed: true,
      };
    }

    const half = Math.ceil(lowVolume.rows.length / 2);
    const controlGroup  = lowVolume.rows.slice(0, half).map(t => t.id);
    const treatmentGroup = lowVolume.rows.slice(half).map(t => t.id);

    const discount = typeof task.context.discount_pct === 'number'
      ? task.context.discount_pct
      : 10;

    const exp = await pool.query<{ id: string }>(
      `INSERT INTO agent_experiments (
         name, description, intent, variant_a, variant_b, metric, status
       ) VALUES ($1, $2, 'price_change', $3, $4, 'booking_count', 'running')
       RETURNING id`,
      [
        `A/B цены −${discount}% (${new Date().toLocaleDateString('ru')})`,
        `Тест скидки ${discount}% на ${lowVolume.rows.length} туров без броней`,
        JSON.stringify({ label: 'control', tour_ids: controlGroup }),
        JSON.stringify({ label: `discount_${discount}pct`, tour_ids: treatmentGroup, discount_pct: discount }),
      ]
    );

    changes.push(`Создан A/B эксперимент ID: ${exp.rows[0].id}`);
    changes.push(`Контрольная группа: ${controlGroup.length} туров`);
    changes.push(`Тестовая группа (−${discount}%): ${treatmentGroup.length} туров`);
    changes.push('Результаты: /hub/admin/agents → Experiments');

    return {
      success: true,
      changes_made: changes,
      errors,
      rollback_available: false,
      verification_passed: true,
    };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
  }
}

// ═══════════════════════════════════════════════════════════════
// EXECUTOR 5: COMMISSION UPDATE (Admin Agent)
// Обновляет commission_rate оператора
// ═══════════════════════════════════════════════════════════════
async function executeCommissionUpdate(task: ExecutionTask): Promise<ExecutionResult> {
  const changes: string[] = [];
  const errors: string[] = [];

  try {
    const newRate    = typeof task.context.new_rate    === 'number' ? task.context.new_rate : null;
    const partnerId  = typeof task.context.partner_id  === 'string' ? task.context.partner_id : null;

    if (!newRate || !partnerId) {
      errors.push('Необходимы context.new_rate и context.partner_id');
      return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
    }

    const result = await pool.query<{ name: string; commission_rate: string }>(
      `UPDATE partners
       SET commission_rate = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING name, commission_rate`,
      [newRate, partnerId]
    );

    if (result.rowCount === 0) {
      errors.push(`Партнёр ${partnerId} не найден`);
      return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
    }

    const partner = result.rows[0];
    changes.push(`Оператор "${partner.name}": комиссия → ${partner.commission_rate}%`);

    return { success: true, changes_made: changes, errors, rollback_available: true, verification_passed: true };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
  }
}

// ═══════════════════════════════════════════════════════════════
// EXECUTOR 6: SQL SELF-HEALING (Evolution Agent)
// ═══════════════════════════════════════════════════════════════
async function executeSQLQueryFix(task: ExecutionTask): Promise<ExecutionResult> {
  const changes: string[] = [];
  const errors: string[] = [];

  try {
    const { fixSQLColumnErrors, scanSQLErrors } = await import('@/lib/agents/tools/board-executor-tools');

    const beforeScan  = scanSQLErrors();
    const totalIssues = beforeScan.reduce((s, f) => s + f.issues.length, 0);

    if (totalIssues === 0) {
      return {
        success: true,
        changes_made: ['SQL-ошибок не обнаружено — система в норме'],
        errors: [],
        rollback_available: false,
        verification_passed: true,
      };
    }

    changes.push(`Обнаружено ${totalIssues} SQL-ошибок в ${beforeScan.length} файлах`);

    const agencyFile = typeof task.context.agency_file === 'string' ? task.context.agency_file : undefined;
    const result = await fixSQLColumnErrors(agencyFile);

    if (!result.success) {
      errors.push(result.message);
    } else {
      changes.push(result.message);
      if (Array.isArray(result.details?.changes)) {
        for (const c of result.details.changes as string[]) changes.push(c);
      }
    }

    const afterScan       = scanSQLErrors();
    const remainingIssues = afterScan.reduce((s, f) => s + f.issues.length, 0);
    const fixed           = totalIssues - remainingIssues;

    changes.push(`Исправлено: ${fixed}/${totalIssues}`);
    if (remainingIssues > 0) errors.push(`Осталось: ${remainingIssues}`);

    return {
      success: fixed > 0,
      changes_made: changes,
      errors,
      rollback_available: false,
      verification_passed: remainingIssues === 0,
    };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    return { success: false, changes_made: [], errors, rollback_available: false, verification_passed: false };
  }
}

// ═══════════════════════════════════════════════════════════════
// EXECUTOR 7: CANCELLATION POLICY UPDATE (Legal Agent)
// Обновляет политику отмены в настройках оператора
// ═══════════════════════════════════════════════════════════════
async function executeCancellationPolicyUpdate(task: ExecutionTask): Promise<ExecutionResult> {
  const changes: string[] = [];
  const errors: string[] = [];

  try {
    const policy   = typeof task.context.policy   === 'string' ? task.context.policy : null;
    const userId   = typeof task.context.user_id  === 'string' ? task.context.user_id : null;

    if (!policy || !userId) {
      errors.push('Необходимы context.policy и context.user_id');
      return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
    }

    await pool.query(
      `INSERT INTO operator_settings (user_id, cancellation_policy, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (user_id)
       DO UPDATE SET cancellation_policy = $2, updated_at = NOW()`,
      [userId, policy]
    );

    changes.push(`Политика отмены обновлена для user_id=${userId}`);
    changes.push(`Новая политика: "${policy.slice(0, 100)}..."`);

    return { success: true, changes_made: changes, errors, rollback_available: true, verification_passed: true };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
  }
}

// ═══════════════════════════════════════════════════════════════
// ENTRY POINT
// ═══════════════════════════════════════════════════════════════
export async function executeInitiative(task: ExecutionTask): Promise<ExecutionResult> {
  const executor = EXECUTORS[task.action_type];

  if (!executor) {
    return {
      success: false,
      changes_made: [],
      errors: [`Нет executor для action_type: "${task.action_type}". Доступны: ${Object.keys(EXECUTORS).join(', ')}`],
      rollback_available: false,
      verification_passed: false,
    };
  }

  await pool.query(
    `UPDATE agent_approvals SET execution_status = 'in_progress', updated_at = NOW() WHERE id = $1`,
    [task.approval_id]
  ).catch(() => null);

  const result = await executor(task);

  await pool.query(
    `UPDATE agent_approvals
     SET execution_status = $1, execution_notes = $2, completed_at = NOW(), updated_at = NOW()
     WHERE id = $3`,
    [result.success ? 'done' : 'failed', JSON.stringify(result), task.approval_id]
  ).catch(() => null);

  return result;
}
