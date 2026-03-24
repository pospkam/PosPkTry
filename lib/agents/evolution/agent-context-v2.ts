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
  ].join('\n');

  // Load context based on agent type
  let metricsSnapshot: Record<string, unknown> = {};
  let dataContext = '';

  if (knowledge.dataSourcesNeeded.includes('agent_bookings')) {
    const bookingsData = await pool.query(
      `SELECT
        COUNT(*) as total_bookings,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days') as bookings_7d,
        COUNT(*) FILTER (WHERE status = 'completed') as completed,
        COUNT(*) FILTER (WHERE status = 'cancelled') as cancelled,
        AVG(total_price) as avg_booking_value
      FROM agent_bookings
      WHERE created_at > NOW() - INTERVAL '${maxDaysOfHistory} days'`
    );
    metricsSnapshot.bookings = bookingsData.rows[0];
    dataContext += `Бронирования (${maxDaysOfHistory}д): ${JSON.stringify(bookingsData.rows[0])}\n`;
  }

  if (knowledge.dataSourcesNeeded.includes('partners')) {
    const operatorsData = await pool.query(
      `SELECT
        COUNT(*) as total_operators,
        COUNT(*) FILTER (WHERE is_public = true) as active_operators,
        AVG(CAST(rating AS FLOAT)) as avg_rating
      FROM partners`
    );
    metricsSnapshot.operators = operatorsData.rows[0];
    dataContext += `Операторы: ${JSON.stringify(operatorsData.rows[0])}\n`;
  }

  if (knowledge.dataSourcesNeeded.includes('agent_route_knowledge')) {
    const routesData = await pool.query(
      `SELECT
        COUNT(*) as total_routes,
        COUNT(*) FILTER (WHERE is_visible = true) as visible_routes,
        COUNT(DISTINCT location_type) as location_types,
        COUNT(DISTINCT activity_type) as activity_types
      FROM agent_route_knowledge`
    );
    metricsSnapshot.routes = routesData.rows[0];
    dataContext += `Маршруты: ${JSON.stringify(routesData.rows[0])}\n`;
  }

  if (knowledge.dataSourcesNeeded.includes('operator_tours')) {
    const toursData = await pool.query(
      `SELECT
        COUNT(*) as total_operator_tours,
        COUNT(*) FILTER (WHERE season_active = true) as active_in_season,
        AVG(CAST(base_price AS FLOAT)) as avg_price
      FROM operator_tours
      WHERE created_at > NOW() - INTERVAL '${maxDaysOfHistory} days'`
    );
    metricsSnapshot.operator_tours = toursData.rows[0];
    dataContext += `Туры операторов: ${JSON.stringify(toursData.rows[0])}\n`;
  }

  if (knowledge.dataSourcesNeeded.includes('sos_events')) {
    try {
      const sosData = await pool.query(
        `SELECT
          COUNT(*)::text as sos_incidents_7d,
          COUNT(*) FILTER (WHERE status = 'resolved')::text as resolved,
          ROUND(COALESCE(EXTRACT(EPOCH FROM AVG(
            CASE WHEN status = 'resolved' AND resolved_at IS NOT NULL
              THEN resolved_at - created_at END
          )) / 60, 0))::text as avg_response_minutes
        FROM sos_events
        WHERE created_at > NOW() - INTERVAL '7 days'`
      );
      metricsSnapshot.sos = sosData.rows[0];
      dataContext += `SOS инциденты: ${JSON.stringify(sosData.rows[0])}\n`;
    } catch { /* non-critical */ }
  }

  // Users data (for Security, Hacker agents)
  if (knowledge.dataSourcesNeeded.includes('users')) {
    try {
      const usersData = await pool.query<{
        total_users: string; new_users_7d: string;
        tourists: string; operators: string;
      }>(
        `SELECT
          COUNT(*)::text AS total_users,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::text AS new_users_7d,
          COUNT(*) FILTER (WHERE role = 'tourist')::text AS tourists,
          COUNT(*) FILTER (WHERE role = 'operator')::text AS operators
        FROM users`
      );
      metricsSnapshot.users = usersData.rows[0];
      dataContext += `Пользователи: ${JSON.stringify(usersData.rows[0])}\n`;
    } catch { /* non-critical */ }
  }

  // Reviews data (for Quality agent)
  if (knowledge.dataSourcesNeeded.includes('reviews_table')) {
    try {
      const reviewsData = await pool.query<{
        total_reviews: string; avg_rating: string;
        negative_reviews: string; reviews_7d: string;
      }>(
        `SELECT
          COUNT(*)::text AS total_reviews,
          ROUND(AVG(rating), 2)::text AS avg_rating,
          COUNT(*) FILTER (WHERE rating <= 2)::text AS negative_reviews,
          COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '7 days')::text AS reviews_7d
        FROM reviews`
      );
      metricsSnapshot.reviews = reviewsData.rows[0];
      dataContext += `Отзывы: ${JSON.stringify(reviewsData.rows[0])}\n`;
    } catch { /* non-critical */ }
  }

  // Tourist demand snapshot from memory bridge (for Planning agent)
  if (knowledge.dataSourcesNeeded.includes('user_ai_memory')) {
    try {
      const demandMemory = await agentMemory.get(agentId, 'demand_snapshot', 'tourist_demand_30d');
      if (demandMemory) {
        metricsSnapshot.tourist_demand = demandMemory.value;
        const demandStr = JSON.stringify(demandMemory.value);
        dataContext += `Спрос туристов (30д): ${demandStr.slice(0, 500)}\n`;
      }
    } catch { /* non-critical */ }
  }

  // Operator bookings data (for Finance, Admin agents)
  if (knowledge.dataSourcesNeeded.includes('operator_bookings')) {
    try {
      const obData = await pool.query<{
        total_30d: string; paid_count: string; revenue_30d: string;
        avg_value: string; refund_count: string;
      }>(
        `SELECT
          COUNT(*)::text AS total_30d,
          COUNT(*) FILTER (WHERE payment_status = 'paid')::text AS paid_count,
          COALESCE(SUM(final_price) FILTER (WHERE payment_status = 'paid'), 0)::text AS revenue_30d,
          COALESCE(AVG(final_price) FILTER (WHERE payment_status = 'paid' AND final_price > 0), 0)::text AS avg_value,
          COUNT(*) FILTER (WHERE payment_status = 'refunded')::text AS refund_count
        FROM operator_bookings
        WHERE created_at >= NOW() - INTERVAL '30 days' AND deleted_at IS NULL`
      );
      metricsSnapshot.operator_bookings = obData.rows[0];
      dataContext += `Брони операторов (30д): ${JSON.stringify(obData.rows[0])}\n`;
    } catch { /* non-critical */ }
  }

  // Agent commissions data (for Finance agent)
  if (knowledge.dataSourcesNeeded.includes('agent_commissions')) {
    try {
      const commData = await pool.query<{
        status: string; count: string; total_amount: string;
      }>(
        `SELECT status, COUNT(*)::text AS count, COALESCE(SUM(amount), 0)::text AS total_amount
        FROM agent_commissions GROUP BY status`
      );
      metricsSnapshot.commissions = commData.rows;
      dataContext += `Комиссии: ${JSON.stringify(commData.rows)}\n`;
    } catch { /* non-critical */ }
  }

  // AI actions log (for Security, Infra, Evo, VibeCoder agents)
  if (knowledge.dataSourcesNeeded.includes('ai_actions_log')) {
    try {
      const aiData = await pool.query<{
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
      );
      metricsSnapshot.ai_actions = aiData.rows[0];
      dataContext += `AI-активность (24ч): ${JSON.stringify(aiData.rows[0])}\n`;
    } catch { /* non-critical */ }
  }

  // Agent approvals (for Security, Infra, Evo agents)
  if (knowledge.dataSourcesNeeded.includes('agent_approvals')) {
    try {
      const apprData = await pool.query<{
        pending: string; approved: string; failed_exec: string;
      }>(
        `SELECT
          COUNT(*) FILTER (WHERE status = 'pending' AND expires_at > NOW())::text AS pending,
          COUNT(*) FILTER (WHERE status = 'approved')::text AS approved,
          COUNT(*) FILTER (WHERE execution_status = 'failed')::text AS failed_exec
        FROM agent_approvals
        WHERE updated_at >= NOW() - INTERVAL '7 days'`
      );
      metricsSnapshot.approvals = apprData.rows[0];
      dataContext += `Одобрения (7д): ${JSON.stringify(apprData.rows[0])}\n`;
    } catch { /* non-critical */ }
  }

  // Board meeting sessions (for Evo, Infra agents)
  if (knowledge.dataSourcesNeeded.includes('board_meeting_sessions')) {
    try {
      const meetData = await pool.query<{
        total_30d: string; completed: string; failed: string; avg_proposals: string;
      }>(
        `SELECT
          COUNT(*)::text AS total_30d,
          COUNT(*) FILTER (WHERE status = 'completed')::text AS completed,
          COUNT(*) FILTER (WHERE status = 'failed')::text AS failed,
          COALESCE(AVG(proposals_count), 0)::text AS avg_proposals
        FROM board_meeting_sessions
        WHERE started_at >= NOW() - INTERVAL '30 days'`
      );
      metricsSnapshot.meetings = meetData.rows[0];
      dataContext += `Совещания (30д): ${JSON.stringify(meetData.rows[0])}\n`;
    } catch { /* non-critical */ }
  }

  // Weather alerts (for Rescue agent)
  if (knowledge.dataSourcesNeeded.includes('weather_alerts')) {
    try {
      const weatherData = await pool.query<{
        active_alerts: string; severe_count: string;
      }>(
        `SELECT
          COUNT(*)::text AS active_alerts,
          COUNT(*) FILTER (WHERE severity IN ('high','extreme'))::text AS severe_count
        FROM weather_alerts
        WHERE created_at >= NOW() - INTERVAL '24 hours'`
      );
      metricsSnapshot.weather = weatherData.rows[0];
      dataContext += `Погодные алерты (24ч): ${JSON.stringify(weatherData.rows[0])}\n`;
    } catch { /* non-critical */ }
  }

  // Recent events from event bus
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

  // Get past decisions from this agent (last 5 board meetings)
  const pastDecisions = await pool.query(
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
  );

  interface PastDecisionRow {
    proposal_title: string | null;
  }

  const previousDecisions = pastDecisions.rows
    .map((r: PastDecisionRow) => `• ${r.proposal_title}`)
    .slice(0, 3);

  // Load training content from agent_memory
  let trainingContent = '';
  try {
    const training = await agentMemory.get(agentId, 'training', 'domain_knowledge');
    if (training) {
      const val = training.value as { content?: string };
      trainingContent = val.content ?? '';
    }
  } catch { /* non-critical */ }

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
    context.trainingContent ? [
      'ДОМЕННЫЕ ЗНАНИЯ:',
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
    '═════════════════════════════════════════════════',
  ].filter(s => s.length > 0).join('\n');
}
