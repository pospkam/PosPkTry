/**
 * PlatformAgent — единая точка входа в AI-систему TourHub.
 *
 * Архитектура (plan.md):
 *   User Intent → PlatformAgent → ContextHub → Agency → Response
 *                                           ↓
 *                                  ObservationLogger
 *
 * Нед. 1-2: keyword intent + AdminAgency (/digest, /leads)
 * Нед. 2-3: OperatorAgency, TouristAgency + AI fallback для unknown intent
 * Нед. 3-4: Learning Layer, Feedback Loop
 */

import { ContextHub, type AgentContext } from './context-hub';
import { ObservationLogger } from './observation-logger';
import { callAIWaterfall } from '@/lib/ai/providers';
import { classifyIntentByKeywords } from './intent-classifier';
import type { ChatMessage } from '@/lib/ai/prompts';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AgentIntent =
  | 'admin_digest'
  | 'admin_health'
  | 'admin_leads'
  | 'op_tours_summary'
  | 'op_bookings_today'
  | 'op_revenue'
  | 'op_create_tour'
  | 'op_fill_ai'
  | 'op_add_slots'
  | 'tourist_recommend'
  | 'unknown';

export interface DispatchParams {
  message: string;
  userId?: number;
  role?: string;
  sessionId?: string;
}

export interface AgentResult {
  intent: AgentIntent;
  response: string;
  duration_ms: number;
  data?: Record<string, unknown>;
}

// ── Keyword intent map ─────────────────────────────────────────────────────────
// Первый проход — keyword based: быстро, без токенов.
// AI fallback срабатывает только для сообщений >20 символов при 'unknown'.
// Сам map — в intent-classifier.ts (тестируется независимо).

const VALID_INTENTS: AgentIntent[] = [
  'admin_digest', 'admin_health', 'admin_leads',
  'op_tours_summary', 'op_bookings_today', 'op_revenue',
  'op_create_tour', 'op_fill_ai', 'op_add_slots',
  'tourist_recommend', 'unknown',
];

// ── PlatformAgent ──────────────────────────────────────────────────────────────

class PlatformAgentClass {
  private readonly contextHub = new ContextHub();
  private readonly logger     = new ObservationLogger();

  async dispatch(params: DispatchParams): Promise<AgentResult> {
    const start = Date.now();

    let intent = this.inferIntent(params.message, params.role);

    // AI fallback для сложных сообщений с неопределённым намерением
    if (intent === 'unknown' && params.message.length > 20) {
      intent = await this.classifyWithAI(params.message, params.role);
    }

    const context = await this.contextHub.build(
      params.userId,
      params.role,
      'platform-agent'
    );

    let response: string;
    let data: Record<string, unknown> | undefined;

    try {
      const result = await this.route(intent, context, params.message);
      response = result.response;
      data     = result.data;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      response = 'Произошла ошибка при обработке запроса';
      await this.logger.log({
        agent_name:    'platform-agent',
        intent:        params.message,
        decision:      intent,
        result:        'fail',
        duration_ms:   Date.now() - start,
        user_id:       params.userId,
        error_message: errMsg,
      });
      return { intent, response, duration_ms: Date.now() - start };
    }

    await this.logger.log({
      agent_name:  'platform-agent',
      intent:      params.message,
      decision:    intent,
      result:      'success',
      duration_ms: Date.now() - start,
      user_id:     params.userId,
    });

    return { intent, response, duration_ms: Date.now() - start, data };
  }

  // ── Intent inference ─────────────────────────────────────────────────────────

  private inferIntent(message: string, role?: string): AgentIntent {
    return classifyIntentByKeywords(message, role);
  }

  private async classifyWithAI(message: string, role?: string): Promise<AgentIntent> {
    const prompt =
      `Определи намерение одним словом из списка (ТОЛЬКО одно слово, без пояснений).\n` +
      `Роль: ${role ?? 'tourist'}\n` +
      `Сообщение: "${message}"\n` +
      `Варианты: ${VALID_INTENTS.join(', ')}`;

    const messages: ChatMessage[] = [{ role: 'user', content: prompt }];
    const raw = await callAIWaterfall(messages);
    const cleaned = (raw ?? '').trim().toLowerCase().split(/\s/)[0] as AgentIntent;
    return VALID_INTENTS.includes(cleaned) ? cleaned : 'unknown';
  }

  // ── Routing ──────────────────────────────────────────────────────────────────

  private async route(
    intent: AgentIntent,
    context: AgentContext,
    originalMessage: string
  ): Promise<{ response: string; data?: Record<string, unknown> }> {
    switch (intent) {
      case 'admin_digest':
      case 'admin_health':
      case 'admin_leads': {
        const { AdminAgency } = await import('./agencies/admin-agency');
        return new AdminAgency().run(intent, context);
      }
      case 'op_tours_summary':
      case 'op_bookings_today':
      case 'op_revenue':
      case 'op_create_tour':
      case 'op_fill_ai':
      case 'op_add_slots': {
        const { OperatorAgency } = await import('./agencies/operator-agency');
        return new OperatorAgency().run(intent, context, originalMessage);
      }
      case 'tourist_recommend': {
        const { TouristAgency } = await import('./agencies/tourist-agency');
        return new TouristAgency().run(intent, context, originalMessage);
      }
      default:
        return { response: 'Не удалось определить намерение. Уточни запрос.' };
    }
  }

  // ── Shortcuts ────────────────────────────────────────────────────────────────

  /** Admin Telegram /digest — вызывается напрямую из webhook */
  async digest(): Promise<string> {
    const result = await this.dispatch({ message: 'дайджест', role: 'admin' });
    return result.response;
  }

  /** Метрика здоровья агентной системы */
  async health(): Promise<{ success_rate: number; platform: unknown }> {
    const [rate, platform] = await Promise.all([
      this.logger.getSuccessRate('platform-agent', 24),
      this.contextHub.getPlatformContext(),
    ]);
    return { success_rate: rate, platform };
  }

  /** ContextHub — для admin dashboard */
  getPlatformContext() {
    return this.contextHub.getPlatformContext();
  }
}

export const PlatformAgent = new PlatformAgentClass();
