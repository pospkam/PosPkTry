/**
 * GET /api/public/stats
 * Публичная статистика экосистемы для виджетов и интеграций
 */

import { NextRequest, NextResponse } from 'next/server';
import { unstable_cache } from 'next/cache';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

const getPublicStats = unstable_cache(
  async () => {
    try {
      const [chats, routes, agents, sos] = await Promise.all([
        pool.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count FROM chat_sessions WHERE updated_at > NOW() - INTERVAL '24 hours'`
        ),
        pool.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count FROM agent_route_knowledge WHERE is_visible = true`
        ),
        pool.query<{ count: string }>(
          `SELECT COUNT(DISTINCT metadata->>'agent_id')::text AS count FROM ai_actions_log WHERE created_at > NOW() - INTERVAL '1 hour'`
        ),
        pool.query<{ count: string }>(
          `SELECT COUNT(*)::text AS count FROM sos_events WHERE created_at > NOW() - INTERVAL '7 days'`
        ),
      ]);

      return {
        platform: {
          name: 'Kamchatour Hub',
          version: '1.0.0',
          url: 'https://tourhab.ru',
        },
        stats: {
          chatsToday: parseInt(chats.rows[0]?.count ?? '0', 10),
          activeRoutes: parseInt(routes.rows[0]?.count ?? '0', 10),
          activeAgents: parseInt(agents.rows[0]?.count ?? '0', 10),
          sosEventsWeek: parseInt(sos.rows[0]?.count ?? '0', 10),
        },
        timestamp: new Date().toISOString(),
        ttl: 300,
      };
    } catch (err) {
      return {
        platform: { name: 'Kamchatour Hub', version: '1.0.0', url: 'https://tourhab.ru' },
        stats: { chatsToday: 0, activeRoutes: 0, activeAgents: 0, sosEventsWeek: 0 },
        error: err instanceof Error ? err.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      };
    }
  },
  ['public-stats'],
  { revalidate: 300 }
);

export async function GET(req: NextRequest) {
  const stats = await getPublicStats();
  return NextResponse.json(stats, {
    headers: {
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      'Access-Control-Allow-Origin': '*',
      'Content-Type': 'application/json',
    },
  });
}
