/**
 * lib/agents/memory/memory-bridge.ts
 * Syncs aggregated user preferences (user_ai_memory) into agent_memory
 * so board agents can see tourist demand patterns.
 *
 * Runs periodically via /api/cron/memory-bridge (every 6 hours).
 */

import { pool } from '@/lib/db-pool';
import { agentMemory } from './agent-memory';

interface ActivityDemandRow {
  activity: string;
  user_count: string;
}

interface LocationDemandRow {
  location: string;
  user_count: string;
}

interface StyleDemandRow {
  travel_style: string;
  user_count: string;
}

interface UserStatsRow {
  total_users: string;
  active_30d: string;
  avg_sessions: string;
}

export async function syncUserDemandToAgentMemory(): Promise<{
  usersProcessed: number;
  demandSignals: number;
}> {
  // Aggregate user preferences from user_ai_memory
  const { rows: activityDemand } = await pool.query<ActivityDemandRow>(
    `SELECT unnest(preferred_activities) AS activity,
            COUNT(DISTINCT user_id)::text AS user_count
     FROM user_ai_memory
     WHERE last_updated > NOW() - INTERVAL '30 days'
       AND array_length(preferred_activities, 1) > 0
     GROUP BY activity
     ORDER BY user_count::int DESC
     LIMIT 20`
  );

  const { rows: locationDemand } = await pool.query<LocationDemandRow>(
    `SELECT unnest(preferred_locations) AS location,
            COUNT(DISTINCT user_id)::text AS user_count
     FROM user_ai_memory
     WHERE last_updated > NOW() - INTERVAL '30 days'
       AND array_length(preferred_locations, 1) > 0
     GROUP BY location
     ORDER BY user_count::int DESC
     LIMIT 20`
  );

  const { rows: styleDemand } = await pool.query<StyleDemandRow>(
    `SELECT travel_style,
            COUNT(*)::text AS user_count
     FROM user_ai_memory
     WHERE last_updated > NOW() - INTERVAL '30 days'
       AND travel_style IS NOT NULL
     GROUP BY travel_style
     ORDER BY user_count::int DESC`
  );

  const { rows: userStats } = await pool.query<UserStatsRow>(
    `SELECT
       COUNT(*)::text AS total_users,
       COUNT(*) FILTER (WHERE last_updated > NOW() - INTERVAL '30 days')::text AS active_30d,
       COALESCE(ROUND(AVG(sessions_count), 1), 0)::text AS avg_sessions
     FROM user_ai_memory`
  );

  // Build demand snapshot
  const demandSnapshot = {
    activity_demand: activityDemand,
    location_demand: locationDemand,
    style_demand: styleDemand,
    user_stats: userStats[0] ?? { total_users: '0', active_30d: '0', avg_sessions: '0' },
    synced_at: new Date().toISOString(),
  };

  // Write aggregated demand to agent_memory for key agents
  const agents = ['planning', 'hacker', 'content', 'admin'];
  for (const agentId of agents) {
    await agentMemory.remember({
      agent_id: agentId,
      memory_type: 'demand_snapshot',
      key: 'tourist_demand_30d',
      value: demandSnapshot,
      confidence: 0.95,
      source: 'memory_bridge',
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // refresh weekly
    });
  }

  return {
    usersProcessed: parseInt(userStats[0]?.active_30d ?? '0', 10),
    demandSignals: activityDemand.length + locationDemand.length,
  };
}
