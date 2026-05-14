/**
 * lib/agents/sdk/rescue-sdk-agent.ts
 *
 * Rescue агент на SDK: автономно проверяет SOS, погоду, активные туры
 * и выносит собственное решение об уровне риска — без жёсткого switch.
 */

import { runSDKAgent, makeQueryTool, type SDKTool } from './sdk-runner';
import { pool } from '@/lib/db-pool';

const RESCUE_SYSTEM_PROMPT = `Ты — Rescue, AI-координатор безопасности туристической платформы Камчатки.
Твоя задача: автономно оценить текущую безопасность туристов и выдать чёткий брифинг.

Действуй по порядку:
1. Проверь активные SOS-события (sos_events, status = 'active')
2. Проверь активные бронирования с предстоящими датами (bookings + tours)
3. Проверь погодные алерты за последние 24 часа (weather_alerts)
4. Если есть активные SOS — это КРИТИЧНО. Детализируй каждое.
5. Сформируй брифинг: статус безопасности + риски + рекомендации

Уровни: 🟢 НОРМА | 🟡 ВНИМАНИЕ | 🔴 КРИТИЧНО
Отвечай на русском. Будь кратким и точным — это оперативный документ.`;

function makeSendAlertTool(): SDKTool {
  return {
    name:        'log_risk_alert',
    description: 'Зафиксировать обнаруженный риск в системе для уведомления операторов.',
    parameters: {
      type: 'object',
      properties: {
        level:   { type: 'string', description: 'Уровень: critical, warning, info', enum: ['critical', 'warning', 'info'] },
        message: { type: 'string', description: 'Описание риска' },
        context: { type: 'string', description: 'Дополнительный контекст (JSON или текст)' },
      },
      required: ['level', 'message'],
    },
    execute: async (args) => {
      await pool.query(
        `INSERT INTO ai_actions_log (action_type, metadata)
         VALUES ('rescue_sdk_alert', $1)`,
        [JSON.stringify({ level: args.level, message: args.message, context: args.context ?? null, ts: new Date().toISOString() })]
      );
      return `Алерт зафиксирован: [${String(args.level).toUpperCase()}] ${String(args.message).slice(0, 100)}`;
    },
  };
}

export async function runRescueSDKAgent(experimentId?: string): Promise<{ response: string; data: Record<string, unknown> }> {
  const result = await runSDKAgent({
    agentId:      'rescue',
    intent:       'rescue_weather_risk',
    systemPrompt: RESCUE_SYSTEM_PROMPT,
    userMessage:  'Проведи полную проверку безопасности прямо сейчас. Есть ли активные SOS? Какие туры под угрозой? Итоговый статус безопасности.',
    tools: [
      makeQueryTool('rescue'),
      makeSendAlertTool(),
    ],
    model:         'anthropic/claude-sonnet-4-6',
    maxIterations: 6,
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
