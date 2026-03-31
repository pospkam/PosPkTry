/**
 * lib/agents/sdk/hacker-sdk-agent.ts
 *
 * Hacker агент на SDK: автономно исследует воронку конверсии,
 * drill-down в слабые места и предлагает конкретные A/B тесты.
 */

import { runSDKAgent, makeQueryTool, type SDKTool } from './sdk-runner';
import { pool } from '@/lib/db-pool';

const HACKER_SYSTEM_PROMPT = `Ты — Hacker, AI growth-хакер туристической платформы Камчатки KamchatourHub.
Твоя задача: найти точки роста конверсии и предложить конкретные A/B тесты.

Действуй как настоящий аналитик:
1. Запроси данные воронки: просмотры страниц → лиды → бронирования
2. Найди самые посещаемые страницы и их конверсию в лид
3. Посмотри источники лидов за последние 30 дней
4. Проверь средний чек и динамику бронирований
5. Если видишь слабое место — сразу создай эксперимент

Будь конкретным: "конверсия маршрута X = 0.3%, средняя по платформе = 1.2% → тест заголовка".
Отвечай на русском. Финал: топ-3 точки роста + готовые A/B гипотезы.`;

function makeCreateExperimentTool(): SDKTool {
  return {
    name:        'create_experiment',
    description: 'Создать новый A/B эксперимент в системе на основе найденной гипотезы.',
    parameters: {
      type: 'object',
      properties: {
        name:        { type: 'string', description: 'Название эксперимента' },
        description: { type: 'string', description: 'Что тестируем и почему' },
        intent:      { type: 'string', description: 'Связанный intent агента (опционально)' },
        variant_a:   { type: 'string', description: 'JSON: описание контрольного варианта A' },
        variant_b:   { type: 'string', description: 'JSON: описание тестового варианта B' },
        metric:      { type: 'string', description: 'Метрика успеха: ctr, conversion, lead_rate и т.д.' },
      },
      required: ['name', 'description', 'variant_a', 'variant_b'],
    },
    execute: async (args) => {
      const { rows } = await pool.query(
        `INSERT INTO agent_experiments (name, description, intent, variant_a, variant_b, metric, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'running')
         RETURNING id, name`,
        [
          String(args.name),
          String(args.description),
          args.intent ? String(args.intent) : null,
          args.variant_a ? JSON.parse(String(args.variant_a)) : {},
          args.variant_b ? JSON.parse(String(args.variant_b)) : {},
          args.metric ? String(args.metric) : 'conversion',
        ]
      );
      const exp = rows[0] as { id: string; name: string } | undefined;
      return exp ? `Эксперимент создан: "${exp.name}" (id: ${exp.id})` : 'Ошибка создания';
    },
  };
}

export async function runHackerSDKAgent(experimentId?: string): Promise<{ response: string; data: Record<string, unknown> }> {
  const result = await runSDKAgent({
    agentId:      'hacker',
    intent:       'hack_growth',
    systemPrompt: HACKER_SYSTEM_PROMPT,
    userMessage:  'Проанализируй воронку конверсии за последние 30 дней. Где теряем пользователей? Предложи 3 конкретных A/B теста с гипотезами.',
    tools: [
      makeQueryTool('hacker'),
      makeCreateExperimentTool(),
    ],
    model:         'anthropic/claude-3.5-sonnet',
    maxIterations: 8,
    experimentId,
  });

  return {
    response: result.response,
    data: {
      toolCallsCount: result.toolCallsCount,
      iterations:     result.iterations,
      durationMs:     result.durationMs,
      runner:         'sdk',
    },
  };
}
