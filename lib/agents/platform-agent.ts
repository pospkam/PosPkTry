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
import { callAIWithModelDirect } from '@/lib/ai/providers';
import { classifyIntentByKeywords } from './intent-classifier';
import type { ChatMessage } from '@/lib/ai/prompts';
import { agentMemory } from './memory/agent-memory';
import { ExperimentTracker } from './learning/experiment-tracker';
import { getModelForAgent } from '@/lib/ai/agent-models';

// ── Types ─────────────────────────────────────────────────────────────────────

export type AgentIntent =
  | 'admin_digest'
  | 'admin_health'
  | 'admin_leads'
  | 'lead_qualify'
  | 'lead_suggest'
  | 'op_tours_summary'
  | 'op_bookings_today'
  | 'op_revenue'
  | 'op_create_tour'
  | 'op_fill_ai'
  | 'op_add_slots'
  | 'tourist_recommend'
  // Гид
  | 'guide_schedule'
  | 'guide_groups'
  | 'guide_earnings'
  | 'guide_status'
  // Трансфер-оператор
  | 'transfer_fleet'
  | 'transfer_drivers'
  | 'transfer_bookings'
  | 'transfer_status'
  // AI Юрист
  | 'legal_contract'
  | 'legal_compliance'
  | 'legal_risks'
  // AI Служба безопасности
  | 'sec_access_audit'
  | 'sec_anomaly'
  | 'sec_report'
  // AI Хакер (growth hacker)
  | 'hack_growth'
  | 'hack_funnel'
  | 'hack_automate'
  // AI Спасатель
  | 'rescue_sos_stats'
  | 'rescue_weather_risk'
  | 'rescue_protocols'
  // AI Эколог
  | 'eco_impact'
  | 'eco_zones'
  // AI Эволюция
  | 'evo_optimize'
  | 'evo_experiments'
  | 'evo_adapt'
  // Контент, маркетинг, планирование, качество
  | 'content_audit'
  | 'content_flag'
  | 'mkt_performance'
  | 'mkt_content_plan'
  | 'plan_forecast'
  | 'plan_season'
  | 'plan_gaps'
  | 'qa_reviews'
  | 'qa_slots'
  | 'qa_operators'
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
  'lead_qualify', 'lead_suggest',
  'op_tours_summary', 'op_bookings_today', 'op_revenue',
  'op_create_tour', 'op_fill_ai', 'op_add_slots',
  'tourist_recommend',
  'guide_schedule', 'guide_groups', 'guide_earnings', 'guide_status',
  'transfer_fleet', 'transfer_drivers', 'transfer_bookings', 'transfer_status',
  'legal_contract', 'legal_compliance', 'legal_risks',
  'sec_access_audit', 'sec_anomaly', 'sec_report',
  'hack_growth', 'hack_funnel', 'hack_automate',
  'rescue_sos_stats', 'rescue_weather_risk', 'rescue_protocols',
  'eco_impact', 'eco_zones',
  'evo_optimize', 'evo_experiments', 'evo_adapt',
  'content_audit', 'content_flag',
  'mkt_performance', 'mkt_content_plan',
  'plan_forecast', 'plan_season', 'plan_gaps',
  'qa_reviews', 'qa_slots', 'qa_operators',
  'unknown',
];

// ── PlatformAgent ──────────────────────────────────────────────────────────────

class PlatformAgentClass {
  private readonly contextHub   = new ContextHub();
  private readonly logger       = new ObservationLogger();
  private readonly experiments  = new ExperimentTracker();

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

    // Load agent memories for context enrichment
    const agentId = this.intentToAgentId(intent);
    if (agentId) {
      // Inject per-agent AI model
      context.preferredModel = getModelForAgent(agentId);
      try {
        const memories = await agentMemory.recall(agentId, undefined, 5);
        context.memories = memories.map(m => ({
          key: m.key,
          value: m.value,
          confidence: Number(m.confidence),
        }));
      } catch { /* non-critical */ }
    }

    // Check for active A/B experiment on this intent
    let experimentVariant: 'a' | 'b' | null = null;
    let activeExperimentId: string | null = null;
    if (intent !== 'unknown') {
      try {
        const running = await this.experiments.list('running');
        const exp = running.find(e => e.intent === intent);
        if (exp) {
          activeExperimentId = exp.id;
          experimentVariant = this.experiments.pickVariant(exp.id);
        }
      } catch { /* non-critical */ }
    }

    let response: string;
    let data: Record<string, unknown> | undefined;

    try {
      const result = await this.route(intent, context, params.message);
      response = result.response;
      data     = result.data;
    } catch (error) {
      const errMsg = error instanceof Error ? error.message : String(error);
      response = 'Произошла ошибка при обработке запроса';

      // Record experiment failure
      if (activeExperimentId && experimentVariant) {
        await this.experiments.recordResult(activeExperimentId, experimentVariant, 'fail', Date.now() - start).catch(() => {});
      }

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

    // Record experiment success
    if (activeExperimentId && experimentVariant) {
      await this.experiments.recordResult(activeExperimentId, experimentVariant, 'success', Date.now() - start).catch(() => {});
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
    const raw = await callAIWithModelDirect(messages, getModelForAgent('router'));
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
      case 'guide_schedule':
      case 'guide_groups':
      case 'guide_earnings':
      case 'guide_status': {
        const { GuideAgency } = await import('./agencies/guide-agency');
        return new GuideAgency().run(intent, context, originalMessage);
      }
      case 'transfer_fleet':
      case 'transfer_drivers':
      case 'transfer_bookings':
      case 'transfer_status': {
        const { TransferOperatorAgency } = await import('./agencies/transfer-operator-agency');
        return new TransferOperatorAgency().run(intent, context, originalMessage);
      }
      case 'legal_contract':
      case 'legal_compliance':
      case 'legal_risks': {
        const { LegalAgency } = await import('./agencies/legal-agency');
        return new LegalAgency().run(intent, context);
      }
      case 'sec_access_audit':
      case 'sec_anomaly':
      case 'sec_report': {
        const { SecurityAgency } = await import('./agencies/security-agency');
        return new SecurityAgency().run(intent, context);
      }
      case 'hack_growth':
      case 'hack_funnel':
      case 'hack_automate': {
        const { HackerAgency } = await import('./agencies/hacker-agency');
        return new HackerAgency().run(intent, context);
      }
      case 'rescue_sos_stats':
      case 'rescue_weather_risk':
      case 'rescue_protocols': {
        const { RescueAgency } = await import('./agencies/rescue-agency');
        return new RescueAgency().run(intent, context);
      }
      case 'eco_impact':
      case 'eco_zones': {
        const { EcoAgency } = await import('./agencies/eco-agency');
        return new EcoAgency().run(intent, context);
      }
      case 'evo_optimize':
      case 'evo_experiments':
      case 'evo_adapt': {
        const { EvolutionAgency } = await import('./agencies/evolution-agency');
        return new EvolutionAgency().run(intent, context);
      }
      case 'content_audit':
      case 'content_flag': {
        const { ContentAuditorAgency } = await import('./agencies/content-auditor-agency');
        return new ContentAuditorAgency().run(intent, context);
      }
      case 'mkt_performance':
      case 'mkt_content_plan': {
        const { MarketingAgency } = await import('./agencies/marketing-agency');
        return new MarketingAgency().run(intent, context);
      }
      case 'plan_forecast':
      case 'plan_season':
      case 'plan_gaps': {
        const { PlanningAgency } = await import('./agencies/planning-agency');
        return new PlanningAgency().run(intent, context);
      }
      case 'qa_reviews':
      case 'qa_slots':
      case 'qa_operators': {
        const { QualityAgency } = await import('./agencies/quality-agency');
        return new QualityAgency().run(intent, context);
      }
      case 'lead_qualify':
      case 'lead_suggest': {
        const { LeadAgency } = await import('./agencies/lead-agency');
        const agency = new LeadAgency();
        if (intent === 'lead_qualify') {
          const result = await agency.qualifyLeads({ limit: 10 });
          return {
            response: `Квалифицировано лидов: ${result.qualified} из ${result.analyzed}. ${result.details}`,
            data: result
          };
        } else {
          return { response: 'Используй lead_qualify для начала работы с лидами' };
        }
      }
      default:
        return { response: 'Не удалось определить намерение. Уточни запрос.' };
    }
  }

  // ── Intent → Agent mapping ──────────────────────────────────────────────────

  private intentToAgentId(intent: AgentIntent): string | null {
    const prefix = intent.split('_')[0];
    const map: Record<string, string> = {
      admin: 'admin', op: 'operator', tourist: 'tourist',
      guide: 'guide', transfer: 'transfer',
      legal: 'legal', sec: 'security', hack: 'hacker',
      rescue: 'rescue', eco: 'eco', evo: 'evo',
      content: 'content', mkt: 'marketing', plan: 'planning',
      qa: 'quality', lead: 'lead',
    };
    return map[prefix] ?? null;
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
