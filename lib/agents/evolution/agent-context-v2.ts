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

  if (knowledge.dataSourcesNeeded.includes('safety_sos')) {
    const sosData = await pool.query(
      `SELECT
        COUNT(*) as sos_incidents_7d,
        COUNT(*) FILTER (WHERE resolved = true) as resolved,
        AVG(EXTRACT(EPOCH FROM (resolved_at - created_at)) / 60) as avg_response_minutes
      FROM safety_sos
      WHERE created_at > NOW() - INTERVAL '7 days'`
    );
    metricsSnapshot.sos = sosData.rows[0];
    dataContext += `SOS инциденты: ${JSON.stringify(sosData.rows[0])}\n`;
  }

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

  const previousDecisions = pastDecisions.rows
    .map((r: any) => `• ${r.proposal_title}`)
    .slice(0, 3);

  return {
    knowledge,
    briefing,
    metricsSnapshot,
    recentEvents: [],
    dataContext,
    previousDecisions,
    pastAnalysis: [],
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
    'ТЕКУЩЕЕ СОСТОЯНИЕ ПЛАТФОРМЫ:',
    context.dataContext,
    '',
    context.previousDecisions.length > 0 ? [
      'ВАШ ПОСЛЕДНИЙ ВКЛАД:',
      context.previousDecisions.join('\n'),
      '',
    ].join('\n') : '',
    '═════════════════════════════════════════════════',
  ].filter(s => s.length > 0).join('\n');
}
