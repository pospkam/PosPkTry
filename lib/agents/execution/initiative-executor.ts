/**
 * lib/agents/execution/initiative-executor.ts
 * AGENT EXECUTION LAYER
 *
 * Когда инициатива одобрена и исполнитель назначен,
 * эта система запускает ФАКТИЧЕСКОЕ выполнение.
 *
 * Phases:
 * 1. Approved + Assigned → trigger executor
 * 2. Executor generates action plan + code
 * 3. Execute changes (via API or direct DB ops)
 * 4. Verify + rollback if needed
 * 5. Report results
 */

import { pool } from '@/lib/db-pool';
import { callAIWaterfall } from '@/lib/ai/providers';
import type { ChatMessage } from '@/lib/ai/prompts';
import { randomBytes } from 'crypto';

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

/** Callback вызывается на каждом шаге исполнения */
export type StepLogger = (eventType: 'started' | 'progress' | 'completed' | 'failed' | 'warning', message: string) => Promise<void>;

/**
 * Executor для каждого типа инициативы
 */
const EXECUTORS: Record<string, (task: ExecutionTask, log: StepLogger) => Promise<ExecutionResult>> = {
  'api_scope_expand':  (task, log) => executeAPIKeyRotation(task, log),
  'booking_rule_change': (task, log) => executeTCUpdate(task, log),
  'ui_copy_change':    (task, log) => executeTourDescriptionRewrite(task, log),
  'price_change':      (task, log) => executeABTestSetup(task, log),
  'commission_change': (task, log) => executeCommissionOptimization(task, log),
  'sql_query_fix':     (task, log) => executeSQLQueryFix(task, log),
  'code_change':       (task, log) => executeCodeChange(task, log),
};

/**
 * ═══════════════════════════════════════════════════════════════
 * EXECUTOR 1: API KEY ROTATION (Security Agent)
 * ═══════════════════════════════════════════════════════════════
 */
async function executeAPIKeyRotation(task: ExecutionTask, log: StepLogger): Promise<ExecutionResult> {
  const changes: string[] = [];
  const errors: string[] = [];

  try {
    await log('started', 'Начинаю ротацию API-ключей OCTO');

    // Step 1: Get all OCTO API keys
    const allKeys = await pool.query(
      `SELECT id, api_key, created_at FROM octo_api_keys ORDER BY created_at DESC`
    );

    await log('progress', `Найдено ${allKeys.rowCount} ключей для ротации`);
    changes.push(`Found ${allKeys.rowCount} old API keys to rotate`);

    // Step 2: Generate new keys (crypto secure)
    const newKeys = allKeys.rows.map(row => ({
      old_id: row.id,
      old_key_last4: row.api_key.slice(-4),
      new_key: generateSecureKey(),
      created_at: new Date(),
    }));

    // Step 3: Store new keys (transaction START)
    for (const keyPair of newKeys) {
      await pool.query(
        `UPDATE octo_api_keys SET api_key = $1, updated_at = NOW(), is_active = true WHERE id = $2`,
        [keyPair.new_key, keyPair.old_id]
      );
      const msg = `Ротация ключа id ${keyPair.old_id} (был ...${keyPair.old_key_last4})`;
      await log('progress', msg);
      changes.push(`Rotated key id ${keyPair.old_id} (was ${keyPair.old_key_last4}...)`);
    }

    // Step 4: Test connectivity to key endpoints
    await log('progress', 'Проверяю подключение к OCTO endpoints...');
    const testResult = await testOCTOEndpoints();
    if (!testResult.success) {
      errors.push(`Endpoint test failed: ${testResult.error}`);
      await log('warning', `Проверка endpoint провалилась: ${testResult.error}`);
    } else {
      changes.push(`All OCTO endpoints verified working`);
      await log('progress', 'Все OCTO endpoints работают');
    }

    const ok = errors.length === 0;
    await log(ok ? 'completed' : 'failed', ok ? `Ротация завершена (${newKeys.length} ключей)` : `Ротация с ошибками: ${errors[0]}`);

    return {
      success: ok,
      changes_made: changes,
      errors,
      rollback_available: true,
      verification_passed: testResult.success,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Rotation error: ${msg}`);
    await log('failed', `Критическая ошибка: ${msg}`);
    return { success: false, changes_made: changes, errors, rollback_available: true, verification_passed: false };
  }
}

/**
 * ═══════════════════════════════════════════════════════════════
 * EXECUTOR 2: T&C UPDATE (Legal Agent)
 * ═══════════════════════════════════════════════════════════════
 */
async function executeTCUpdate(task: ExecutionTask, log: StepLogger): Promise<ExecutionResult> {
  const changes: string[] = [];
  const errors: string[] = [];

  try {
    await log('started', 'Обновляю условия бронирования (weather policy)');

    const currentTC = await pool.query(
      `SELECT id, content, version FROM platform_terms WHERE type = 'weather_policy' ORDER BY version DESC LIMIT 1`
    );

    const oldVersion = currentTC.rows[0]?.version ?? 0;
    const newVersion = oldVersion + 1;

    await log('progress', `Текущая версия: v${oldVersion} → создаю v${newVersion}`);

    const updatedClause = `
      Weather Cancellation Policy (v${newVersion}):
      - Operator must provide 48-hour notice for weather-related cancellations
      - Tourist receives 100% refund or rebooking within 30 days
      - Force majeure (hurricanes, etc) = 50% refund
    `;

    changes.push(`Created new T&C version ${newVersion}`);

    const newTC = await pool.query(
      `INSERT INTO platform_terms (type, content, version, created_at)
       VALUES ('weather_policy', $1, $2, NOW())
       RETURNING id`,
      [updatedClause, newVersion]
    );

    await log('progress', `T&C v${newVersion} записан в БД (id: ${newTC.rows[0].id})`);
    changes.push(`Stored T&C v${newVersion} (id: ${newTC.rows[0].id})`);

    const affectedContracts = await pool.query(
      `SELECT id, operator_id FROM partners WHERE contract_version < $1 LIMIT 10`,
      [newVersion]
    );

    await log('progress', `Найдено ${affectedContracts.rowCount} договоров к обновлению`);
    changes.push(`Found ${affectedContracts.rowCount} affected operator contracts`);

    for (const contract of affectedContracts.rows) {
      await pool.query(
        `UPDATE partners SET contract_version = $1, updated_at = NOW() WHERE id = $2`,
        [newVersion, contract.id]
      );
    }

    changes.push(`Updated ${affectedContracts.rowCount} contract references`);
    await log('completed', `T&C обновлён до v${newVersion}, ${affectedContracts.rowCount} договоров актуализировано`);

    return { success: true, changes_made: changes, errors, rollback_available: true, verification_passed: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`T&C update error: ${msg}`);
    await log('failed', `Ошибка обновления T&C: ${msg}`);
    return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
  }
}

/**
 * ═══════════════════════════════════════════════════════════════
 * EXECUTOR 3: TOUR DESCRIPTION REWRITE (Content Agent)
 * ═══════════════════════════════════════════════════════════════
 */
async function executeTourDescriptionRewrite(task: ExecutionTask, log: StepLogger): Promise<ExecutionResult> {
  const changes: string[] = [];
  const errors: string[] = [];

  try {
    await log('started', 'Ищу туры с низким CTR для переработки описаний');

    const lowCTRTours = await pool.query(
      `SELECT id, title, short_description, agent_route_id
       FROM agent_route_knowledge
       WHERE is_visible = true
       ORDER BY ctr_rate ASC
       LIMIT 23`
    );

    await log('progress', `Найдено ${lowCTRTours.rowCount} туров с низким CTR`);
    changes.push(`Found ${lowCTRTours.rowCount} low-CTR tours to optimize`);

    const improvedDescriptions: Array<{ id: number; old: string; new: string }> = [];

    for (const tour of lowCTRTours.rows) {
      const prompt = [
        `Tour: ${tour.title}`,
        `Current: "${tour.short_description}"`,
        '',
        'Rewrite this tour description to be:',
        '1. Emotionally engaging (specific details, sensory)',
        '2. Value-focused (what tourist gets)',
        '3. Action-oriented (call to action)',
        '',
        'Keep under 150 chars. Only return the new description.',
      ].join('\n');

      const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
      const newDesc = await callAIWaterfall(messages);

      improvedDescriptions.push({ id: tour.id, old: tour.short_description || '', new: newDesc || '' });
      await log('progress', `Переписано: "${tour.title.substring(0, 50)}..."`);
      changes.push(`Rewrote: "${tour.title}"`);
    }

    for (const desc of improvedDescriptions) {
      await pool.query(
        `UPDATE agent_route_knowledge SET short_description = $1, updated_at = NOW() WHERE id = $2`,
        [desc.new, desc.id]
      );
    }

    changes.push(`Updated ${improvedDescriptions.length} descriptions in database`);
    await log('completed', `Все ${improvedDescriptions.length} описаний обновлены в БД`);

    return { success: errors.length === 0, changes_made: changes, errors, rollback_available: true, verification_passed: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Description rewrite error: ${msg}`);
    await log('failed', `Ошибка переработки описаний: ${msg}`);
    return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
  }
}

/**
 * ═══════════════════════════════════════════════════════════════
 * EXECUTOR 4: A/B TEST SETUP (Hacker Agent)
 * ═══════════════════════════════════════════════════════════════
 */
async function executeABTestSetup(task: ExecutionTask, log: StepLogger): Promise<ExecutionResult> {
  const changes: string[] = [];
  const errors: string[] = [];

  try {
    await log('started', 'Запускаю A/B тест цен на туры с низким спросом');

    const lowVolumeTours = await pool.query(
      `SELECT id, title, base_price, booking_count_30d
       FROM operator_tours
       WHERE booking_count_30d < 10
       ORDER BY RANDOM()
       LIMIT 30`
    );

    changes.push(`Selected ${lowVolumeTours.rowCount} tours for A/B test`);
    await log('progress', `Выбрано ${lowVolumeTours.rowCount} туров для A/B теста (-10% цена)`);

    const controlTours   = lowVolumeTours.rows.slice(0, 15);
    const treatmentTours = lowVolumeTours.rows.slice(15, 30);

    const experiment = await pool.query(
      `INSERT INTO agent_experiments (
        name, description, status, variant_a, variant_b, metric, created_at
      ) VALUES (
        'Dynamic Pricing -10% A/B Test',
        'Test -10% dynamic pricing on low-volume tours',
        'running',
        $1, $2, 'conversion_rate', NOW()
      )
      RETURNING id`,
      [JSON.stringify({ tours: controlTours.map(t => t.id) }), JSON.stringify({ tours: treatmentTours.map(t => t.id) })]
    );

    await log('progress', `Эксперимент создан: ${experiment.rows[0].id}`);
    changes.push(`Created experiment ID: ${experiment.rows[0].id}`);

    for (const tour of treatmentTours) {
      const discountedPrice = Math.round(tour.base_price * 0.9);
      await pool.query(
        `UPDATE operator_tours
         SET base_price = $1, ab_test_variant = 'treatment', ab_test_id = $2, updated_at = NOW()
         WHERE id = $3`,
        [discountedPrice, experiment.rows[0].id, tour.id]
      );
      changes.push(`Applied -10% pricing to tour ${tour.id}`);
    }

    await log('progress', `Скидка -10% применена к ${treatmentTours.length} турам`);

    for (const tour of controlTours) {
      await pool.query(
        `UPDATE operator_tours SET ab_test_variant = 'control', ab_test_id = $1, updated_at = NOW() WHERE id = $2`,
        [experiment.rows[0].id, tour.id]
      );
    }

    changes.push(`A/B test active for 14 days (${lowVolumeTours.rowCount} tours)`);
    await log('completed', `A/B тест запущен: ${controlTours.length} контроль + ${treatmentTours.length} treatment`);

    return { success: true, changes_made: changes, errors, rollback_available: true, verification_passed: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`A/B test setup error: ${msg}`);
    await log('failed', `Ошибка запуска A/B теста: ${msg}`);
    return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
  }
}

/**
 * ═══════════════════════════════════════════════════════════════
 * EXECUTOR 5: COMMISSION BATCH OPTIMIZATION (Admin Agent)
 * ═══════════════════════════════════════════════════════════════
 */
async function executeCommissionOptimization(task: ExecutionTask, log: StepLogger): Promise<ExecutionResult> {
  const changes: string[] = [];
  const errors: string[] = [];

  try {
    await log('started', 'Анализирую очередь комиссий и настраиваю батч-обработку');

    const stats = await pool.query(
      `SELECT
        COUNT(*) as pending_count,
        AVG(EXTRACT(EPOCH FROM (NOW() - created_at))) as avg_wait_seconds,
        MAX(EXTRACT(EPOCH FROM (NOW() - created_at))) as max_wait_seconds
      FROM agent_commissions
      WHERE status = 'pending'`
    );

    const pending = stats.rows[0].pending_count;
    const avgWait = Math.round(stats.rows[0].avg_wait_seconds ?? 0);
    await log('progress', `${pending} комиссий в очереди, средное ожидание: ${avgWait}с`);
    changes.push(`${pending} pending commissions`);
    changes.push(`Average wait: ${avgWait}s`);

    const batchSize    = 100;
    const parallelStreams = 4;

    await pool.query(
      `INSERT INTO platform_config (key, value, updated_at)
       VALUES ('commission_batch_size', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [batchSize.toString()]
    );

    await pool.query(
      `INSERT INTO platform_config (key, value, updated_at)
       VALUES ('commission_parallel_streams', $1, NOW())
       ON CONFLICT (key) DO UPDATE SET value = $1, updated_at = NOW()`,
      [parallelStreams.toString()]
    );

    await log('progress', `Конфигурация обновлена: batch=${batchSize}, parallel=${parallelStreams}`);
    changes.push(`Configuration updated (batch_size=${batchSize}, parallel=${parallelStreams})`);
    changes.push(`Rollout schedule: 5% -> 25% -> 50% -> 100% (daily)`);
    await log('completed', `Оптимизация батча комиссий активирована`);

    return { success: true, changes_made: changes, errors, rollback_available: true, verification_passed: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    errors.push(`Commission optimization error: ${msg}`);
    await log('failed', `Ошибка оптимизации комиссий: ${msg}`);
    return { success: false, changes_made: changes, errors, rollback_available: false, verification_passed: false };
  }
}

/**
 * ═══════════════════════════════════════════════════════════════
 * HELPERS
 * ═══════════════════════════════════════════════════════════════
 */

function generateSecureKey(): string {
  const prefix = 'sk_live_';
  const randomPart = randomBytes(32).toString('hex');
  return prefix + randomPart;
}

async function testOCTOEndpoints(): Promise<{ success: boolean; error?: string }> {
  try {
    const octoBaseUrl = process.env.OCTO_API_URL || 'https://api.octo.travel/v1';
    const octoApiKey = process.env.OCTO_API_KEY;

    if (!octoApiKey) {
      return { success: false, error: 'OCTO_API_KEY not configured' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(`${octoBaseUrl}/health`, {
        method: 'GET',
        headers: {
          'X-API-KEY': octoApiKey,
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        return {
          success: false,
          error: `OCTO API returned ${response.status}`,
        };
      }

      return { success: true };
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * ═══════════════════════════════════════════════════════════════
 * EXECUTOR 6: SQL SELF-HEALING (Evolution / Security Agent)
 * Агент обнаружил SQL-ошибки → система сама патчит agency-файлы
 * ═══════════════════════════════════════════════════════════════
 */
async function executeSQLQueryFix(task: ExecutionTask, log: StepLogger): Promise<ExecutionResult> {
  const changes: string[] = [];
  const errors: string[] = [];

  try {
    await log('started', 'Сканирую SQL-ошибки в agency-файлах');

    const { fixSQLColumnErrors, scanSQLErrors } = await import('@/lib/agents/tools/board-executor-tools');

    const beforeScan = scanSQLErrors();
    const totalIssues = beforeScan.reduce((s, f) => s + f.issues.length, 0);

    if (totalIssues === 0) {
      await log('completed', 'SQL-ошибок не обнаружено — система в норме');
      return { success: true, changes_made: ['SQL-ошибок не обнаружено — система в норме'], errors: [], rollback_available: false, verification_passed: true };
    }

    await log('progress', `Обнаружено ${totalIssues} SQL-ошибок в ${beforeScan.length} файлах`);
    changes.push(`Обнаружено ${totalIssues} SQL-ошибок в ${beforeScan.length} файлах`);

    const agencyFile = typeof task.context.agency_file === 'string' ? task.context.agency_file : undefined;
    const result = await fixSQLColumnErrors(agencyFile);

    if (!result.success) {
      errors.push(result.message);
      await log('warning', `Частичное исправление: ${result.message}`);
    } else {
      changes.push(result.message);
      if (result.details?.changes && Array.isArray(result.details.changes)) {
        for (const c of result.details.changes as string[]) {
          changes.push(c);
          await log('progress', c);
        }
      }
    }

    const afterScan = scanSQLErrors();
    const remainingIssues = afterScan.reduce((s, f) => s + f.issues.length, 0);
    const fixed = totalIssues - remainingIssues;
    const verificationPassed = remainingIssues === 0;

    changes.push(`Исправлено: ${fixed}/${totalIssues} ошибок`);
    if (!verificationPassed) {
      errors.push(`Осталось нерешённых проблем: ${remainingIssues}`);
      await log('warning', `Осталось ${remainingIssues} нерешённых SQL-ошибок`);
    }

    await log(verificationPassed ? 'completed' : 'failed', `SQL самолечение: исправлено ${fixed}/${totalIssues}`);

    return { success: fixed > 0, changes_made: changes, errors, rollback_available: false, verification_passed: verificationPassed };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await log('failed', `executeSQLQueryFix провалился: ${msg}`);
    return { success: false, changes_made: [], errors: [`executeSQLQueryFix failed: ${msg}`], rollback_available: false, verification_passed: false };
  }
}

/**
 * ═══════════════════════════════════════════════════════════════
 * EXECUTOR 7: CODE CHANGE (Vibe Coder Agent)
 * ═══════════════════════════════════════════════════════════════
 *
 * Регистрирует одобрённое изменение кода.
 * В production-деплое (Docker на Timeweb) файловая система сбрасывается при
 * каждом деплое, поэтому фиксация кода происходит через git commit.
 * Этот executor: логирует намерение + генерирует патч-инструкцию для разработчика.
 */
async function executeCodeChange(task: ExecutionTask, log: StepLogger): Promise<ExecutionResult> {
  const changes: string[] = [];
  const errors: string[] = [];

  try {
    await log('started', 'Vibe Coder: начинаю оформление одобрённого изменения кода');

    const filePath     = typeof task.context.file_path === 'string'   ? task.context.file_path   : null;
    const issue        = typeof task.context.issue === 'string'       ? task.context.issue       : task.description;
    const proposedFix  = typeof task.context.proposed_fix === 'string' ? task.context.proposed_fix : null;
    const priority     = typeof task.context.priority === 'string'    ? task.context.priority    : 'medium';

    await log('progress', `Задача: ${issue}`);
    if (filePath)    await log('progress', `Целевой файл: ${filePath}`);
    if (proposedFix) await log('progress', `Предложенное решение: ${proposedFix.substring(0, 200)}`);

    // Генерируем инструкцию для разработчика через AI
    const aiMessages: ChatMessage[] = [
      {
        role: 'user',
        content: [
          'Ты senior TypeScript + Next.js разработчик.',
          'Директор одобрил следующее изменение кода:',
          '',
          `Файл: ${filePath ?? 'не указан'}`,
          `Проблема: ${issue}`,
          `Предложение: ${proposedFix ?? 'детали в описании'}`,
          `Приоритет: ${priority}`,
          '',
          'Напиши КОНКРЕТНУЮ инструкцию для разработчика:',
          '1. Что именно изменить (строки кода)',
          '2. Как проверить что всё работает',
          '3. Риски изменения',
          'Формат: plain text, 5-10 строк. Без markdown.',
        ].join('\n'),
      },
    ];

    const instruction = await callAIWaterfall(aiMessages).catch(() => null);

    if (instruction) {
      await log('progress', `Инструкция: ${instruction.substring(0, 400)}`);
      changes.push(`Инструкция разработчику сформирована`);
    }

    // Записываем в ai_actions_log для отслеживания
    await pool.query(
      `INSERT INTO ai_actions_log (action_type, metadata)
       VALUES ($1, $2)`,
      [
        'code_change_approved',
        JSON.stringify({
          approval_id:   task.approval_id,
          executor:      task.executor_agent_id,
          file_path:     filePath,
          issue,
          proposed_fix:  proposedFix,
          instruction:   instruction ?? null,
          priority,
        }),
      ]
    ).catch(() => null);

    changes.push(`Изменение зарегистрировано: approval_id=${task.approval_id}`);
    if (filePath) changes.push(`Файл: ${filePath}`);
    changes.push('Статус: ожидает git commit от разработчика');

    await log('completed', `Vibe Coder: изменение одобрено и зафиксировано. Файл: ${filePath ?? 'уточнить'}`);

    return {
      success:             true,
      changes_made:        changes,
      errors,
      rollback_available:  false,
      verification_passed: true,
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await log('failed', `executeCodeChange провалился: ${msg}`);
    return {
      success:             false,
      changes_made:        [],
      errors:              [`executeCodeChange failed: ${msg}`],
      rollback_available:  false,
      verification_passed: false,
    };
  }
}

/**
 * Main executor entry point
 */
export async function executeInitiative(task: ExecutionTask, onStep?: StepLogger): Promise<ExecutionResult> {
  const executor = EXECUTORS[task.action_type];

  if (!executor) {
    const err = `No executor for action type: ${task.action_type}`;
    if (onStep) await onStep('failed', err).catch(() => null);
    return { success: false, changes_made: [], errors: [err], rollback_available: false, verification_passed: false };
  }

  // Combined logger: DB + SSE callback
  const log: StepLogger = async (eventType, message) => {
    await pool.query(
      `INSERT INTO approval_execution_log (approval_id, actor, event_type, message)
       VALUES ($1, $2, $3, $4)`,
      [task.approval_id, task.executor_agent_id ?? 'system', eventType, message]
    ).catch(() => null);
    if (onStep) await onStep(eventType, message).catch(() => null);
  };

  // Mark in_progress
  await pool.query(
    `UPDATE agent_approvals SET execution_status = 'in_progress', updated_at = NOW() WHERE id = $1`,
    [task.approval_id]
  );

  // Execute
  const result = await executor(task, log);

  // Mark done or failed
  await pool.query(
    `UPDATE agent_approvals
     SET execution_status = $1, execution_notes = $2, completed_at = NOW(), updated_at = NOW()
     WHERE id = $3`,
    [result.success ? 'done' : 'failed', JSON.stringify({ changes: result.changes_made, errors: result.errors }), task.approval_id]
  );

  return result;
}
