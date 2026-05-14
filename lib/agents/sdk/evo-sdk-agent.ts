/**
 * lib/agents/sdk/evo-sdk-agent.ts
 *
 * Evo агент на SDK-паттерне: Claude сам решает, какие данные запросить,
 * какие паттерны найти и как сформировать рекомендации.
 *
 * Инструменты: query_db, read_memory, write_memory, list_experiments
 * Эксперимент: evo-classic vs evo-sdk (agent_experiments)
 */

import { runSDKAgent, makeQueryTool, makeReadMemoryTool, type SDKTool } from './sdk-runner';
import { pool } from '@/lib/db-pool';

const EVO_SYSTEM_PROMPT = `Ты — Evo, AI-архитектор туристической платформы Камчатки KamchatourHub.
Твоя задача: автономный самоанализ системы и формирование конкретных рекомендаций по улучшению.

У тебя есть инструменты для запроса базы данных, чтения памяти агентов и записи инсайтов.
Действуй автономно:
1. Запроси метрики производительности агентов из ai_actions_log
2. Проверь последние A/B эксперименты из agent_experiments
3. Прочитай недавние инсайты из agent_memory
4. На основе данных сформулируй 3-5 конкретных улучшений

Всегда отвечай на русском языке. Будь конкретным — цифры, не абстракции.
Формат: краткий анализ + нумерованный список рекомендаций.`;

function makeWriteMemoryTool(): SDKTool {
  return {
    name:        'write_memory',
    description: 'Сохранить инсайт или рекомендацию в память агента для будущих сессий.',
    parameters: {
      type: 'object',
      properties: {
        key:   { type: 'string', description: 'Ключ памяти, например "evo_insight_2026-03"' },
        value: { type: 'string', description: 'Содержимое инсайта (строка или JSON)' },
        ttl_hours: { type: 'string', description: 'Срок хранения в часах (по умолчанию 168 = 7 дней)' },
      },
      required: ['key', 'value'],
    },
    execute: async (args) => {
      const ttlHours = parseInt(String(args.ttl_hours ?? '168'), 10);
      await pool.query(
        `INSERT INTO agent_memory (agent_id, key, value, expires_at)
         VALUES ('evo', $1, $2, NOW() + ($3 || ' hours')::INTERVAL)
         ON CONFLICT (agent_id, key) DO UPDATE
           SET value = EXCLUDED.value, expires_at = EXCLUDED.expires_at, updated_at = NOW()`,
        [String(args.key), String(args.value), ttlHours]
      );
      return `Инсайт сохранён: ${String(args.key)}`;
    },
  };
}

function makeListExperimentsTool(): SDKTool {
  return {
    name:        'list_experiments',
    description: 'Получить список текущих A/B экспериментов с их статусами и результатами.',
    parameters: {
      type: 'object',
      properties: {
        status: {
          type: 'string',
          description: 'Фильтр по статусу: running, paused, completed',
          enum: ['running', 'paused', 'completed'],
        },
      },
    },
    execute: async (args) => {
      const { rows } = await pool.query(
        `SELECT id, name, intent, variant_a->>'description' as variant_a,
                variant_b->>'description' as variant_b,
                metric, status, winner, created_at
         FROM agent_experiments
         WHERE ($1::text IS NULL OR status = $1)
         ORDER BY created_at DESC LIMIT 20`,
        [args.status ?? null]
      );
      return rows.length ? JSON.stringify(rows) : 'Эксперименты не найдены';
    },
  };
}

export async function runEvoSDKAgent(experimentId?: string): Promise<{ response: string; data: Record<string, unknown> }> {
  const result = await runSDKAgent({
    agentId:      'evo',
    intent:       'evo_optimize',
    systemPrompt: EVO_SYSTEM_PROMPT,
    userMessage:  'Проведи самоанализ системы за последние 7 дней. Какие агенты работают плохо? Что нужно улучшить? Есть ли паттерны ошибок?',
    tools: [
      makeQueryTool('evo'),
      makeReadMemoryTool(),
      makeWriteMemoryTool(),
      makeListExperimentsTool(),
    ],
    model:         'anthropic/claude-sonnet-4-6',
    maxIterations: 8,
    experimentId,
  });

  return {
    response: result.response,
    data: {
      toolCallsCount: result.toolCallsCount,
      iterations:     result.iterations,
      durationMs:     result.durationMs,
      inputTokens:    result.inputTokens,
      outputTokens:   result.outputTokens,
      runner:         'sdk',
    },
  };
}
