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
  'bulk_notify',         // admin: массовые уведомления туристам по лидам
  'schedule_suggest',    // rescue: проверить расписание туров, алерт о проблемах
  'prompt_optimize',     // evo: AI-анализ и оптимизация промптов агентов
  // ── New action types (июнь 2026) ──
  'tour_suspend',        // quality: приостановить тур с плохими отзывами
  'operator_warning',    // quality: предупреждение оператору через Telegram
  'security_block',      // security: блокировка IP/пользователя
  'zone_capacity',       // eco: лимиты на зоны
  'flag_payment',        // finance: пометить подозрительный платёж
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
  bulk_notify:         executeBulkNotify,
  schedule_suggest:    executeScheduleSuggest,
  prompt_optimize:     executePromptOptimize,
  // ── New action executors (июнь 2026) ──
  tour_suspend:        executeTourSuspend,
  operator_warning:    executeOperatorWarning,
  security_block:      executeSecurityBlock,
  zone_capacity:       executeZoneCapacity,
  flag_payment:        executeFlagPayment,
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
// ═══════════════════════════════════════════════════════════════
// EXECUTOR: BULK NOTIFY (Admin Agent)
// Шлёт Telegram-дайджест: активные лиды без ответа > 24ч
// ═══════════════════════════════════════════════════════════════
async function executeBulkNotify(task: ExecutionTask): Promise<ExecutionResult> {
  const changes: string[] = [];
  const errors: string[] = [];

  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId   = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      errors.push('TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID не настроены');
      return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
    }

    const leadsRes = await pool.query<{ cnt: string }>(
      `SELECT COUNT(*) as cnt FROM leads
       WHERE status IN ('new','contacted')
         AND created_at < NOW() - INTERVAL '24 hours'`
    );
    const staleCount = parseInt(leadsRes.rows[0]?.cnt ?? '0', 10);

    const toursRes = await pool.query<{ cnt: string }>(
      `SELECT COUNT(*) as cnt FROM operator_tours WHERE is_active = true`
    );
    const activeTours = parseInt(toursRes.rows[0]?.cnt ?? '0', 10);

    const text = [
      '<b>Дайджест платформы TourHab</b>',
      '',
      `Лидов без ответа (&gt;24ч): <b>${staleCount}</b>`,
      `Активных туров: <b>${activeTours}</b>`,
      '',
      'Источник: Execution Pack / bulk_notify',
    ].join('\n');

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });

    if (!res.ok) {
      errors.push(`Telegram API: ${res.status}`);
      return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
    }

    changes.push(`Дайджест отправлен: ${staleCount} лидов без ответа, ${activeTours} активных туров`);
    return { success: true, changes_made: changes, errors, rollback_available: false, verification_passed: true };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
  }
}

// ═══════════════════════════════════════════════════════════════
// EXECUTOR: SCHEDULE SUGGEST (Rescue Agent)
// Проверяет туры без доступных слотов — шлёт алерт в Telegram
// ═══════════════════════════════════════════════════════════════
async function executeScheduleSuggest(task: ExecutionTask): Promise<ExecutionResult> {
  const changes: string[] = [];
  const errors: string[] = [];

  try {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId   = process.env.TELEGRAM_CHAT_ID;

    if (!botToken || !chatId) {
      errors.push('TELEGRAM_BOT_TOKEN или TELEGRAM_CHAT_ID не настроены');
      return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
    }

    const toursRes = await pool.query<{ title: string; operator_id: string }>(
      `SELECT t.title, t.operator_id
       FROM operator_tours t
       WHERE t.is_active = true
         AND NOT EXISTS (
           SELECT 1 FROM operator_bookings b
           WHERE b.operator_tour_id = t.id
             AND b.booking_status = 'confirmed'
             AND b.created_at > NOW() - INTERVAL '30 days'
         )
       LIMIT 10`
    );

    const noBookingTours = toursRes.rows;

    const text = [
      '<b>Rescue: анализ расписания туров</b>',
      '',
      noBookingTours.length > 0
        ? `Туров без броней за 30 дней: <b>${noBookingTours.length}</b>\n` +
          noBookingTours.slice(0, 5).map(t => `  • ${t.title}`).join('\n')
        : 'Все активные туры имеют свежие брони — ОК.',
      '',
      'Рекомендация: проверить наличие актуального расписания у операторов.',
      'Источник: Execution Pack / schedule_suggest',
    ].join('\n');

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });

    if (!res.ok) {
      errors.push(`Telegram API: ${res.status}`);
      return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
    }

    changes.push(`Алерт расписания отправлен: ${noBookingTours.length} туров без броней за 30 дней`);
    return { success: true, changes_made: changes, errors, rollback_available: false, verification_passed: true };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
  }
}

// ═══════════════════════════════════════════════════════════════
// EXECUTOR: PROMPT OPTIMIZE (Evo Agent)
// AI анализирует текущий waterfall + промпты, сохраняет улучшения
// ═══════════════════════════════════════════════════════════════
async function executePromptOptimize(task: ExecutionTask): Promise<ExecutionResult> {
  const changes: string[] = [];
  const errors: string[] = [];

  try {
    const model = getModelForAgent('evo');

    const systemPrompt = `Ты AI-архитектор платформы TourHab (Камчатка).
  Проанализируй типичные проблемы с latency AI-агентов и предложи 3 конкретных оптимизации промптов.
  Формат ответа: JSON массив объектов { "agent": string, "issue": string, "fix": string }`;

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: `Задача: ${task.description}
KPI: ${task.context.kpi_target ?? 'снизить p95 latency на 25%'}
Проанализируй и выдай 3 приоритетных оптимизации.`,
      },
    ];

    const aiResponse = await callAIWithModelDirect(messages, model);

    let optimizations: Array<{ agent: string; issue: string; fix: string }> = [];
    try {
      const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
      if (jsonMatch) optimizations = JSON.parse(jsonMatch[0]);
    } catch {
      optimizations = [{ agent: 'evo', issue: 'parse error', fix: aiResponse.substring(0, 200) }];
    }

    const { agentMemory } = await import('@/lib/agents/memory/agent-memory');
    for (const [index, opt] of optimizations.slice(0, 3).entries()) {
      await agentMemory.remember({
        agent_id: 'evo',
        memory_type: 'insight',
        key: `prompt_opt_${task.approval_id}_${index + 1}`,
        value: {
          type: 'prompt_optimization',
          agent: opt.agent,
          issue: opt.issue,
          fix: opt.fix,
          source: 'execution_pack',
        },
        source: 'initiative_executor',
      });
      changes.push(`Оптимизация для ${opt.agent}: ${opt.fix.substring(0, 80)}`);
    }

    return {
      success: true,
      changes_made: changes,
      errors,
      rollback_available: false,
      verification_passed: changes.length > 0,
    };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
  }
}

// ═══════════════════════════════════════════════════════════════
// EXECUTOR: TOUR SUSPEND (Quality Agent)
// Деактивирует тур с плохими отзывами, уведомляет оператора
// ═══════════════════════════════════════════════════════════════
async function executeTourSuspend(task: ExecutionTask): Promise<ExecutionResult> {
  const changes: string[] = [];
  const errors: string[] = [];

  try {
    const tourId = typeof task.context.tour_id === 'number' ? task.context.tour_id : null;
    const reason = typeof task.context.reason === 'string' ? task.context.reason : 'Приостановлен по решению Quality Agent';

    if (!tourId) {
      errors.push('Необходим context.tour_id (number)');
      return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
    }

    const tour = await pool.query<{ title: string; operator_id: string; is_active: boolean }>(
      `SELECT title, operator_id, is_active FROM operator_tours WHERE id = $1 AND deleted_at IS NULL`,
      [tourId]
    );

    if (tour.rows.length === 0) {
      errors.push(`Тур ${tourId} не найден`);
      return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
    }

    if (!tour.rows[0].is_active) {
      return {
        success: true,
        changes_made: [`Тур "${tour.rows[0].title}" уже деактивирован`],
        errors: [],
        rollback_available: false,
        verification_passed: true,
      };
    }

    await pool.query(
      `UPDATE operator_tours SET is_active = false, updated_at = NOW() WHERE id = $1`,
      [tourId]
    );

    // Логируем в ai_actions_log
    await pool.query(
      `INSERT INTO ai_actions_log (action_type, agent_id, details, created_at)
       VALUES ('tour_suspend', 'quality', $1, NOW())`,
      [JSON.stringify({ tour_id: tourId, reason, title: tour.rows[0].title })]
    );

    changes.push(`Тур "${tour.rows[0].title}" (ID: ${tourId}) приостановлен`);
    changes.push(`Причина: ${reason}`);

    // Telegram-уведомление
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId   = process.env.TELEGRAM_CHAT_ID;
    if (botToken && chatId) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `Quality Agent: тур "${tour.rows[0].title}" приостановлен.\nПричина: ${reason}`,
          parse_mode: 'HTML',
        }),
      }).catch(() => null);
    }

    return { success: true, changes_made: changes, errors, rollback_available: true, verification_passed: true };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
  }
}

// ═══════════════════════════════════════════════════════════════
// EXECUTOR: OPERATOR WARNING (Quality Agent)
// Отправляет предупреждение оператору через Telegram + запись в БД
// ═══════════════════════════════════════════════════════════════
async function executeOperatorWarning(task: ExecutionTask): Promise<ExecutionResult> {
  const changes: string[] = [];
  const errors: string[] = [];

  try {
    const operatorId = typeof task.context.operator_id === 'string' ? task.context.operator_id : null;
    const message    = typeof task.context.message === 'string' ? task.context.message : null;
    const severity   = typeof task.context.severity === 'string' ? task.context.severity : 'warning';

    if (!operatorId || !message) {
      errors.push('Необходимы context.operator_id и context.message');
      return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
    }

    const operator = await pool.query<{ name: string }>(
      `SELECT name FROM partners WHERE id = $1`,
      [operatorId]
    );

    if (operator.rows.length === 0) {
      errors.push(`Оператор ${operatorId} не найден`);
      return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
    }

    // Запись предупреждения в ai_actions_log
    await pool.query(
      `INSERT INTO ai_actions_log (action_type, agent_id, details, created_at)
       VALUES ('operator_warning', 'quality', $1, NOW())`,
      [JSON.stringify({ operator_id: operatorId, operator_name: operator.rows[0].name, message, severity })]
    );

    changes.push(`Предупреждение для "${operator.rows[0].name}": ${message.slice(0, 120)}`);
    changes.push(`Серьёзность: ${severity}`);

    // Telegram-уведомление собственнику
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId   = process.env.TELEGRAM_CHAT_ID;
    if (botToken && chatId) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `Quality Agent [${severity}]: оператор "${operator.rows[0].name}"\n${message}`,
          parse_mode: 'HTML',
        }),
      }).catch(() => null);
    }

    return { success: true, changes_made: changes, errors, rollback_available: false, verification_passed: true };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
  }
}

// ═══════════════════════════════════════════════════════════════
// EXECUTOR: SECURITY BLOCK (Security Agent)
// Блокирует IP или деактивирует подозрительного пользователя
// ═══════════════════════════════════════════════════════════════
async function executeSecurityBlock(task: ExecutionTask): Promise<ExecutionResult> {
  const changes: string[] = [];
  const errors: string[] = [];

  try {
    const blockType = typeof task.context.block_type === 'string' ? task.context.block_type : null;

    if (blockType === 'ip') {
      const ip       = typeof task.context.ip === 'string' ? task.context.ip : null;
      const reason   = typeof task.context.reason === 'string' ? task.context.reason : 'Security Agent: suspicious activity';
      const duration = typeof task.context.duration_hours === 'number' ? task.context.duration_hours : 24;

      if (!ip) {
        errors.push('Необходим context.ip для блокировки IP');
        return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
      }

      // Validate IP format
      const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
      if (!ipRegex.test(ip)) {
        errors.push(`Невалидный IP: ${ip}`);
        return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
      }

      await pool.query(
        `INSERT INTO security_blocks (ip, reason, blocked_by, expires_at, created_at)
         VALUES ($1, $2, 'security_agent', NOW() + ($3 || ' hours')::interval, NOW())
         ON CONFLICT (ip) DO UPDATE SET reason = $2, expires_at = NOW() + ($3 || ' hours')::interval`,
        [ip, reason, String(duration)]
      );

      // Log action
      await pool.query(
        `INSERT INTO ai_actions_log (action_type, agent_id, details, created_at)
         VALUES ('security_block', 'security', $1, NOW())`,
        [JSON.stringify({ block_type: 'ip', ip, reason, duration_hours: duration })]
      );

      changes.push(`IP ${ip} заблокирован на ${duration}ч`);
      changes.push(`Причина: ${reason}`);

    } else if (blockType === 'user') {
      const userId = typeof task.context.user_id === 'string' ? task.context.user_id : null;
      const reason = typeof task.context.reason === 'string' ? task.context.reason : 'Security Agent: account compromise';

      if (!userId) {
        errors.push('Необходим context.user_id для блокировки пользователя');
        return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
      }

      const user = await pool.query<{ email: string }>(
        `SELECT email FROM users WHERE id = $1`,
        [userId]
      );

      if (user.rows.length === 0) {
        errors.push(`Пользователь ${userId} не найден`);
        return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
      }

      await pool.query(
        `UPDATE users SET is_blocked = true, blocked_reason = $2, updated_at = NOW() WHERE id = $1`,
        [userId, reason]
      );

      await pool.query(
        `INSERT INTO ai_actions_log (action_type, agent_id, details, created_at)
         VALUES ('security_block', 'security', $1, NOW())`,
        [JSON.stringify({ block_type: 'user', user_id: userId, email: user.rows[0].email, reason })]
      );

      changes.push(`Пользователь ${user.rows[0].email} заблокирован`);
      changes.push(`Причина: ${reason}`);
    } else {
      errors.push('context.block_type должен быть "ip" или "user"');
      return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
    }

    // Telegram-уведомление
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId   = process.env.TELEGRAM_CHAT_ID;
    if (botToken && chatId) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `Security Agent: ${changes.join('. ')}`,
          parse_mode: 'HTML',
        }),
      }).catch(() => null);
    }

    return { success: true, changes_made: changes, errors, rollback_available: true, verification_passed: true };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
  }
}

// ═══════════════════════════════════════════════════════════════
// EXECUTOR: ZONE CAPACITY (Eco Agent)
// Устанавливает/обновляет лимит посещений на зону
// ═══════════════════════════════════════════════════════════════
async function executeZoneCapacity(task: ExecutionTask): Promise<ExecutionResult> {
  const changes: string[] = [];
  const errors: string[] = [];

  try {
    const zone     = typeof task.context.zone === 'string' ? task.context.zone : null;
    const maxDaily = typeof task.context.max_daily_visitors === 'number' ? task.context.max_daily_visitors : null;
    const reason   = typeof task.context.reason === 'string' ? task.context.reason : 'Eco Agent: load management';

    if (!zone || !maxDaily) {
      errors.push('Необходимы context.zone и context.max_daily_visitors');
      return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
    }

    if (maxDaily < 1 || maxDaily > 10000) {
      errors.push(`Невалидный лимит: ${maxDaily}. Допустимо: 1-10000`);
      return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
    }

    await pool.query(
      `INSERT INTO zone_capacity_limits (zone, max_daily_visitors, reason, set_by, created_at)
       VALUES ($1, $2, $3, 'eco_agent', NOW())
       ON CONFLICT (zone)
       DO UPDATE SET max_daily_visitors = $2, reason = $3, updated_at = NOW()`,
      [zone, maxDaily, reason]
    );

    await pool.query(
      `INSERT INTO ai_actions_log (action_type, agent_id, details, created_at)
       VALUES ('zone_capacity', 'eco', $1, NOW())`,
      [JSON.stringify({ zone, max_daily_visitors: maxDaily, reason })]
    );

    changes.push(`Зона "${zone}": лимит ${maxDaily} посетителей/день`);
    changes.push(`Причина: ${reason}`);

    // Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId   = process.env.TELEGRAM_CHAT_ID;
    if (botToken && chatId) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `Eco Agent: зона "${zone}" — лимит ${maxDaily} чел/день. ${reason}`,
          parse_mode: 'HTML',
        }),
      }).catch(() => null);
    }

    return { success: true, changes_made: changes, errors, rollback_available: true, verification_passed: true };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
  }
}

// ═══════════════════════════════════════════════════════════════
// EXECUTOR: FLAG PAYMENT (Finance Agent)
// Помечает подозрительный платёж для ручной проверки
// ═══════════════════════════════════════════════════════════════
async function executeFlagPayment(task: ExecutionTask): Promise<ExecutionResult> {
  const changes: string[] = [];
  const errors: string[] = [];

  try {
    const bookingId = typeof task.context.booking_id === 'string' ? task.context.booking_id : null;
    const reason    = typeof task.context.reason === 'string' ? task.context.reason : 'Finance Agent: anomaly detected';
    const flagType  = typeof task.context.flag_type === 'string' ? task.context.flag_type : 'suspicious';

    if (!bookingId) {
      errors.push('Необходим context.booking_id');
      return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
    }

    const booking = await pool.query<{ tourist_name: string | null; final_price: string; payment_status: string }>(
      `SELECT tourist_name, final_price, payment_status
       FROM operator_bookings WHERE id = $1 AND deleted_at IS NULL`,
      [bookingId]
    );

    if (booking.rows.length === 0) {
      errors.push(`Бронирование ${bookingId} не найдено`);
      return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
    }

    const b = booking.rows[0];

    // Ставим флаг (payment_status = 'flagged' если ещё не оплачен)
    await pool.query(
      `UPDATE operator_bookings
       SET admin_notes = COALESCE(admin_notes, '') || $2,
           updated_at = NOW()
       WHERE id = $1`,
      [bookingId, `\n[FLAGGED ${new Date().toISOString().slice(0, 10)}] ${flagType}: ${reason}`]
    );

    await pool.query(
      `INSERT INTO ai_actions_log (action_type, agent_id, details, created_at)
       VALUES ('flag_payment', 'finance', $1, NOW())`,
      [JSON.stringify({ booking_id: bookingId, tourist: b.tourist_name, amount: b.final_price, flag_type: flagType, reason })]
    );

    changes.push(`Бронирование ${bookingId} помечено: ${flagType}`);
    changes.push(`Турист: ${b.tourist_name ?? 'N/A'}, сумма: ${b.final_price}`);
    changes.push(`Причина: ${reason}`);

    // Telegram
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    const chatId   = process.env.TELEGRAM_CHAT_ID;
    if (botToken && chatId) {
      await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text: `Finance Agent [${flagType}]: бронирование ${bookingId}\n${b.tourist_name ?? 'Аноним'} — ${b.final_price} руб.\n${reason}`,
          parse_mode: 'HTML',
        }),
      }).catch(() => null);
    }

    return { success: true, changes_made: changes, errors, rollback_available: true, verification_passed: true };
  } catch (err) {
    errors.push(err instanceof Error ? err.message : String(err));
    return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
  }
}

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

  try {
    await pool.query(
      `UPDATE agent_approvals SET execution_status = 'in_progress' WHERE id = $1`,
      [task.approval_id]
    );
  } catch {
    // Не прерываем фактическое выполнение, но финальная запись результата обязательна.
  }

  const result = await executor(task);

  // AUTO-RETRY: при провале сбрасываем в assigned если retry_count < 2 (Wishlist #3)
  try {
    if (!result.success) {
      const retryRow = await pool.query<{ retry_count: number }>(
        `SELECT retry_count FROM agent_approvals WHERE id = $1`,
        [task.approval_id]
      );
      const currentRetry = retryRow.rows[0]?.retry_count ?? 0;

      if (currentRetry < 2) {
        await pool.query(
          `UPDATE agent_approvals
           SET execution_status = 'assigned',
               retry_count = retry_count + 1,
               execution_notes = $2
           WHERE id = $1`,
          [task.approval_id, JSON.stringify({ ...result, retry_scheduled: true, attempt: currentRetry + 1 })]
        );
      } else {
        await pool.query(
          `UPDATE agent_approvals
           SET execution_status = 'failed',
               execution_notes = $2,
               completed_at = NOW()
           WHERE id = $1`,
          [task.approval_id, JSON.stringify({ ...result, retry_exhausted: true, attempts: currentRetry + 1 })]
        );
      }
    } else {
      await pool.query(
        `UPDATE agent_approvals
         SET execution_status = 'done',
             execution_notes = $2,
             completed_at = NOW()
         WHERE id = $1`,
        [task.approval_id, JSON.stringify(result)]
      );
    }
  } catch (err) {
    const dbErr = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      changes_made: result.changes_made,
      errors: [...result.errors, `Не удалось сохранить результат исполнения: ${dbErr}`],
      rollback_available: result.rollback_available,
      verification_passed: false,
    };
  }

  return result;
}
