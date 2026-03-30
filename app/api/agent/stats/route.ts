/**
 * GET /api/agent/stats
 * Статистика агента: комиссии по месяцам, удержание клиентов, топ туры.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireAgent } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const userOrResponse = await requireAgent(request);
  if (userOrResponse instanceof NextResponse) return userOrResponse;

  const agentId = userOrResponse.userId;

  const [commissionsResult, retentionResult, topToursResult, repeatClientsResult] =
    await Promise.all([
      // Комиссии по месяцам за 6 месяцев
      query<{ month: string; amount: string }>(
        `SELECT
           TO_CHAR(DATE_TRUNC('month', created_at), 'Mon') AS month,
           COALESCE(SUM(amount), 0)::text                  AS amount
         FROM agent_commissions
         WHERE agent_id = $1
           AND created_at >= NOW() - INTERVAL '6 months'
         GROUP BY DATE_TRUNC('month', created_at)
         ORDER BY DATE_TRUNC('month', created_at) ASC`,
        [agentId]
      ),

      // Удержание: клиенты с > 1 бронью / всего клиентов
      query<{ total: string; repeat: string }>(
        `SELECT
           COUNT(*)::text                                            AS total,
           COUNT(*) FILTER (WHERE total_bookings > 1)::text         AS repeat
         FROM agent_clients
         WHERE agent_id = $1`,
        [agentId]
      ),

      // Топ-5 туров по числу бронирований
      query<{ name: string; bookings: string }>(
        `SELECT
           t.title       AS name,
           COUNT(b.id)::text AS bookings
         FROM agent_bookings b
         JOIN operator_tours t ON t.id = b.tour_id
         WHERE b.agent_id = $1
           AND b.status IN ('confirmed', 'completed')
         GROUP BY t.id, t.title
         ORDER BY COUNT(b.id) DESC
         LIMIT 5`,
        [agentId]
      ),

      // Число повторных клиентов
      query<{ count: string }>(
        `SELECT COUNT(*)::text AS count
         FROM agent_clients
         WHERE agent_id = $1 AND total_bookings > 1`,
        [agentId]
      ),
    ]);

  const totalClients  = parseInt(retentionResult.rows[0]?.total  ?? '0', 10);
  const repeatClients = parseInt(retentionResult.rows[0]?.repeat ?? '0', 10);
  const retention = totalClients > 0
    ? Math.round((repeatClients / totalClients) * 100)
    : 0;

  return NextResponse.json({
    success: true,
    data: {
      commissions: commissionsResult.rows.map(r => ({
        month:  r.month,
        amount: parseFloat(r.amount),
      })),
      retention,
      repeatClients: parseInt(repeatClientsResult.rows[0]?.count ?? '0', 10),
      topTours: topToursResult.rows.map(r => ({
        name:     r.name,
        bookings: parseInt(r.bookings, 10),
      })),
    },
  });
}
