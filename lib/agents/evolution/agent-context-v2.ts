/**
 * lib/agents/evolution/agent-context-v2.ts
 * AGENT EVOLUTION — Phase 2: Rich Context
 *
 * Instead of "Agent doesn't know what's happening",
 * agents arrive with:
 * - Briefing (who they are)
 * - Recent metrics snapshot
 * - Memory of past decisions
 * - Board meeting history
 *
 * Result: From 8 errors → all agents working
 */

import { pool } from '@/lib/db-pool';
import { getAgentKnowledgeBase } from './agent-knowledge';
import type { AgentKnowledgeBase } from './agent-knowledge';
import { getEventBus } from '@/lib/events/agent-bus';
import { agentMemory } from '@/lib/agents/memory/agent-memory';
import { knowledgeBase } from '@/lib/agents/memory/agent-knowledge';

export interface RichAgentContext {
  // Who they are
  knowledge: AgentKnowledgeBase;
  briefing: string;

  // What they see (current state)
  metricsSnapshot: Record<string, unknown>;
  recentEvents: string[];
  dataContext: string;

  // What they remember (history)
  previousDecisions: string[];
  pastAnalysis: string[];

  // Domain training
  trainingContent: string;

  // How they should work
  timeLimit: number; // milliseconds
  maxRetries: number;
}

/**
 * Build rich context for agent
 * Called before every agent work session
 */
export async function buildRichAgentContext(
  agentId: string,
  meetingId: string,
  maxDaysOfHistory: number = 7
): Promise<RichAgentContext> {
  const knowledge = getAgentKnowledgeBase(agentId);
  const briefing = [
    `╔════════════════════════════════════════════════╗`,
    `║ СОВЕЩАНИЕ СОВЕТА ДИРЕКТОРОВ #${meetingId}`,
    `║ Агент: ${knowledge.agentName}`,
    `╚════════════════════════════════════════════════╝`,
    '',
    knowledge.mission,
    '',
    `КЕЙ-МЕТРИКИ (следи за ними): ${knowledge.metrics.join(', ')}`,
    `ВНЕ ТВОЕЙ ЗОНЫ (не анализируй): ${knowledge.blind_spots.join(', ')}`,
    '',
  ].join('\n');

  // ── Parallel data loading: collect all needed queries, fire at once ──
  const metricsSnapshot: Record<string, unknown> = {};
  let dataContext = '';
  const needs = (src: string) => knowledge.dataSourcesNeeded.includes(src);

  // Define data source fetchers — each returns a label callback
  type DataResult = { key: string; label: string; data: unknown; rows?: unknown[] };
  const fetchers: Promise<DataResult | null>[] = [];

  if (needs('agent_bookings')) {
    fetchers.push(pool.query(
      `SELECT
        COUNT(*) as total_bookings,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as bookings_7d,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        AVG(total_price) as avg_booking_value
      FROM agent_bookings
      WHERE created_at > NOW() - INTERVAL '${maxDaysOfHistory} days'`
    ).then(r => ({ key: 'bookings', label: `Бронирования (${maxDaysOfHistory}д)`, data: r.rows[0] })).catch(() => null));
  }

  if (needs('partners')) {
    fetchers.push(pool.query(
      `SELECT
        COUNT(*) as total_operators,
        COUNT(*) FILTER (WHERE is_public = true) as active_operators,
        AVG(CAST(rating AS FLOAT)) as avg_rating
      FROM partners`
    ).then(r => ({ key: 'operators', label: 'Операторы', data: r.rows[0] })).catch(() => null));
  }

  if (needs('agent_route_knowledge')) {
    fetchers.push(pool.query(
      `SELECT
        COUNT(*) as total_routes,
        COUNT(*) FILTER (WHERE is_visible = true) as visible_routes,
        COUNT(DISTINCT location_type) as location_types,
        COUNT(DISTINCT activity_type) as activity_types
      FROM agent_route_knowledge`
    ).then(r => ({ key: 'routes', label: 'Маршруты', data: r.rows[0] })).catch(() => null));
  }

  if (needs('operator_tours')) {
    fetchers.push(pool.query(
      `SELECT
        COUNT(*) as total_operator_tours,
        COUNT(*) FILTER (WHERE season_active = true) as active_in_season,
        AVG(CAST(base_price AS FLOAT)) as avg_price
      FROM operator_tours
      WHERE created_at > NOW() - INTERVAL '${maxDaysOfHistory} days'`
    ).then(r => ({ key: 'operator_tours', label: 'Туры операторов', data: r.rows[0] })).catch(() => null));
  }

  if (needs('sos_events')) {
    fetchers.push(pool.query(
      `SELECT
        COUNT(*)::text as sos_incidents_7d,
        COUNT(*) FILTER (WHERE status = 'resolved')::text as resolved,
        '0'::text as avg_response_minutes
      FROM sos_events
      WHERE created_at > NOW() - INTERVAL '7 days'`
    ).then(r => ({ key: 'sos', label: 'SOS инциденты', data: r.rows[0] })).catch(() => null));
  }

  if (needs('users')) {
    fetchers.push(pool.query<{
      total_users: string; new_users_7d: string; tourists: string; operators: string;
    }>(
      `SELECT
        COUNT(*)::text AS total_users,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::text AS new_users_7d,
        COUNT(*) FILTER (WHERE role = 'tourist')::text AS tourists,
        COUNT(*) FILTER (WHERE role = 'operator')::text AS operators
      FROM users`
    ).then(r => ({ key: 'users', label: 'Пользователи', data: r.rows[0] })).catch(() => null));
  }

  if (needs('reviews_table')) {
    fetchers.push(pool.query<{
      total_reviews: string; avg_rating: string; negative_reviews: string; reviews_7d: string;
    }>(
      `SELECT
        COUNT(*)::text AS total_reviews,
        ROUND(AVG(rating), 2)::text AS avg_rating,
        COUNT(*) FILTER (WHERE rating <= 2)::text AS negative_reviews,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::text AS reviews_7d
      FROM reviews`
    ).then(r => ({ key: 'reviews', label: 'Отзывы', data: r.rows[0] })).catch(() => null));
  }

  if (needs('user_ai_memory')) {
    fetchers.push(
      agentMemory.get(agentId, 'demand_snapshot', 'tourist_demand_30d')
        .then(mem => {
          if (!mem) return null;
          return { key: 'tourist_demand', label: 'Спрос туристов (30д)', data: mem.value } as DataResult;
        }).catch(() => null)
    );
  }

  if (needs('operator_bookings')) {
    fetchers.push(pool.query<{
      total_30d: string; paid_count: string; revenue_30d: string; avg_value: string; refund_count: string;
    }>(
      `SELECT
        COUNT(*)::text AS total_30d,
        COUNT(*) FILTER (WHERE payment_status = 'paid')::text AS paid_count,
        COALESCE(SUM(final_price) FILTER (WHERE payment_status = 'paid'), 0)::text AS revenue_30d,
        COALESCE(AVG(final_price) FILTER (WHERE payment_status = 'paid' AND final_price > 0), 0)::text AS avg_value,
        COUNT(*) FILTER (WHERE payment_status = 'refunded')::text AS refund_count
      FROM operator_bookings
      WHERE created_at >= NOW() - INTERVAL '30 days' AND deleted_at IS NULL`
    ).then(r => ({ key: 'operator_bookings', label: 'Брони операторов (30д)', data: r.rows[0] })).catch(() => null));
  }

  if (needs('agent_commissions')) {
    fetchers.push(pool.query<{
      status: string; count: string; total_amount: string;
    }>(
      `SELECT status, COUNT(*)::text AS count, COALESCE(SUM(amount), 0)::text AS total_amount
      FROM agent_commissions GROUP BY status`
    ).then(r => ({ key: 'commissions', label: 'Комиссии', data: r.rows[0], rows: r.rows })).catch(() => null));
  }

  if (needs('ai_actions_log')) {
    fetchers.push(pool.query<{
      total_24h: string; failed_24h: string; top_type: string;
    }>(
      `SELECT
        COUNT(*)::text AS total_24h,
        COUNT(*) FILTER (WHERE metadata->>'error' IS NOT NULL)::text AS failed_24h,
        (SELECT action_type FROM ai_actions_log
          WHERE created_at >= NOW() - INTERVAL '24 hours'
          GROUP BY action_type ORDER BY COUNT(*) DESC LIMIT 1) AS top_type
      FROM ai_actions_log
      WHERE created_at >= NOW() - INTERVAL '24 hours'`
    ).then(r => ({ key: 'ai_actions', label: 'AI-активность (24ч)', data: r.rows[0] })).catch(() => null));
  }

  if (needs('agent_approvals')) {
    fetchers.push(pool.query<{
      pending: string; approved: string; failed_exec: string;
    }>(
      `SELECT
        COUNT(*) FILTER (WHERE status = 'pending' AND expires_at > NOW())::text AS pending,
        COUNT(*) FILTER (WHERE status = 'approved')::text AS approved,
        COUNT(*) FILTER (WHERE execution_status = 'failed')::text AS failed_exec
      FROM agent_approvals
      WHERE updated_at >= NOW() - INTERVAL '7 days'`
    ).then(r => ({ key: 'approvals', label: 'Одобрения (7д)', data: r.rows[0] })).catch(() => null));
  }

  if (needs('board_meeting_sessions')) {
    fetchers.push(pool.query<{
      total_30d: string; completed: string; failed: string; avg_proposals: string;
    }>(
      `SELECT
        COUNT(*)::text AS total_30d,
        COUNT(*) FILTER (WHERE status = 'completed')::text AS completed,
        COUNT(*) FILTER (WHERE status = 'failed')::text AS failed,
        COALESCE(AVG(proposals_count), 0)::text AS avg_proposals
      FROM board_meeting_sessions
      WHERE started_at >= NOW() - INTERVAL '30 days'`
    ).then(r => ({ key: 'meetings', label: 'Совещания (30д)', data: r.rows[0] })).catch(() => null));
  }

  if (needs('weather_alerts')) {
    fetchers.push(pool.query<{
      active_alerts: string; severe_count: string;
    }>(
      `SELECT
        COUNT(*)::text AS active_alerts,
        COUNT(*) FILTER (WHERE severity IN ('high','extreme'))::text AS severe_count
      FROM weather_alerts
      WHERE created_at >= NOW() - INTERVAL '24 hours'`
    ).then(r => ({ key: 'weather', label: 'Погодные алерты (24ч)', data: r.rows[0] })).catch(() => null));
  }

  // Past decisions + training — fire in parallel with data sources
  const pastDecisionsP = pool.query(
    `SELECT DISTINCT proposal_title
    FROM (
      SELECT metadata->>'proposal_title' as proposal_title
      FROM ai_actions_log
      WHERE metadata->>'agent_id' = $1
        AND action_type = 'agent_proposal_validation'
        AND created_at > NOW() - INTERVAL '30 days'
      ORDER BY created_at DESC
      LIMIT 5
    ) t
    WHERE proposal_title IS NOT NULL`,
    [agentId]
  ).catch(() => ({ rows: [] as { proposal_title: string | null }[] }));

  const trainingP = agentMemory.get(agentId, 'training', 'domain_knowledge').catch(() => null);

  // Brain knowledge: search for relevant permanent knowledge pages
  const brainP = knowledgeBase.search(knowledge.agentName, { limit: 5 }).catch(() => []);

  // ── Fire everything at once ──
  const [dataResults, pastDecisions, training, brainPages] = await Promise.all([
    Promise.all(fetchers),
    pastDecisionsP,
    trainingP,
    brainP,
  ]);

  // Assemble metrics + data context from parallel results
  for (const result of dataResults) {
    if (!result) continue;
    metricsSnapshot[result.key] = result.rows ?? result.data;
    dataContext += `${result.label}: ${JSON.stringify(result.rows ?? result.data)}\n`;
  }

  // Recent events from event bus (sync, no IO)
  const bus = getEventBus();
  const allRecent = bus.getRecent(undefined, 50);
  const recentEvents = allRecent
    .filter(e => {
      return knowledge.respondsTo.some(keyword =>
        e.type.includes(keyword) || JSON.stringify(e.data).toLowerCase().includes(keyword)
      );
    })
    .slice(0, 10)
    .map(e => `[${e.type}] ${new Date(e.timestamp).toLocaleString('ru-RU')}: ${JSON.stringify(e.data).slice(0, 200)}`);

  interface PastDecisionRow { proposal_title: string | null }
  const previousDecisions = pastDecisions.rows
    .map((r: PastDecisionRow) => `• ${r.proposal_title}`)
    .slice(0, 3);

  let trainingContent = '';
  if (training) {
    const val = training.value as { content?: string };
    trainingContent = val.content ?? '';
  }
  // Fallback: use static domain knowledge from knowledge base when DB has nothing
  if (!trainingContent && knowledge.domainKnowledge) {
    trainingContent = knowledge.domainKnowledge.trim();
  } else if (knowledge.domainKnowledge) {
    // Prepend static knowledge so it always comes first
    trainingContent = `${knowledge.domainKnowledge.trim()}\n\n${trainingContent}`;
  }

  // Inject brain knowledge pages into training content
  if (brainPages.length > 0) {
    const brainBlock = brainPages.map(p =>
      `[${p.type}/${p.slug}] ${p.title}: ${p.compiled_truth.slice(0, 300)}`
    ).join('\n');
    trainingContent = trainingContent
      ? `${trainingContent}\n\nАГЕНТНАЯ ПАМЯТЬ (brain):\n${brainBlock}`
      : `АГЕНТНАЯ ПАМЯТЬ (brain):\n${brainBlock}`;
  }

  return {
    knowledge,
    briefing,
    metricsSnapshot,
    recentEvents,
    dataContext,
    previousDecisions,
    pastAnalysis: [],
    trainingContent,
    timeLimit: 15000, // 15 seconds per agent
    maxRetries: 2,
  };
}

/**
 * Format context into agent prompt preamble
 */
export function formatContextForPrompt(context: RichAgentContext): string {
  return [
    context.briefing,
    '═════════════════════════════════════════════════',
    '',
    context.knowledge.domainKnowledge ? [
      'БАЗА ЗНАНИЙ АГЕНТА:',
      context.knowledge.domainKnowledge,
      '',
    ].join('\n') : '',
    context.trainingContent ? [
      'ДОМЕННЫЕ ЗНАНИЯ (из памяти):',
      context.trainingContent,
      '',
    ].join('\n') : '',
    'ТЕКУЩЕЕ СОСТОЯНИЕ ПЛАТФОРМЫ:',
    context.dataContext,
    '',
    context.recentEvents.length > 0 ? [
      'ПОСЛЕДНИЕ СОБЫТИЯ:',
      context.recentEvents.join('\n'),
      '',
    ].join('\n') : '',
    context.previousDecisions.length > 0 ? [
      'ВАШ ПОСЛЕДНИЙ ВКЛАД:',
      context.previousDecisions.join('\n'),
      '',
    ].join('\n') : '',
    context.knowledge.questionsToAsk.length > 0 ? [
      'ОБЯЗАТЕЛЬНО ОТВЕТЬ НА ЭТИ ВОПРОСЫ В ОТЧЁТЕ:',
      context.knowledge.questionsToAsk.map((q, i) => `${i + 1}. ${q}`).join('\n'),
      '',
    ].join('\n') : '',
    '═════════════════════════════════════════════════',
  ].filter(s => s.length > 0).join('\n');
}
