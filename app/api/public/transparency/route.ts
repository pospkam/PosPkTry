/**
 * GET /api/public/transparency
 * Агрегированные данные об управлении платформой AI-советом.
 * Доступ: только admin.
 * Cache: 5 мин.
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { requireAdmin } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authOrResponse = await requireAdmin(request);
    if (authOrResponse instanceof NextResponse) {
      return authOrResponse;
    }

    const [statsRes, decisionsRes, agentsRes] = await Promise.all([
      // Общая статистика совета
      pool.query<{
        total_decisions: string;
        approved: string;
        rejected: string;
        pending: string;
        executed: string;
        this_month: string;
      }>(`
        SELECT
          COUNT(*)::text                                                    AS total_decisions,
          COUNT(*) FILTER (WHERE status = 'approved')::text                AS approved,
          COUNT(*) FILTER (WHERE status = 'rejected')::text                AS rejected,
          COUNT(*) FILTER (WHERE status = 'pending')::text                 AS pending,
          COUNT(*) FILTER (WHERE execution_status = 'done')::text          AS executed,
          COUNT(*) FILTER (WHERE created_at >= date_trunc('month', NOW()))::text AS this_month
        FROM agent_approvals
      `),

      // Последние 12 решений — только публичная часть
      pool.query<{
        action_type: string;
        title: string | null;
        status: string;
        requested_by: string;
        execution_status: string | null;
        created_at: string;
        reviewed_at: string | null;
      }>(`
        SELECT
          action_type,
          SUBSTRING(description, 1, 120) AS title,
          status,
          requested_by,
          execution_status,
          created_at,
          reviewed_at
        FROM agent_approvals
        WHERE status IN ('approved', 'rejected')
        ORDER BY created_at DESC
        LIMIT 12
      `),

      // Активность агентов по памяти (сколько записей за 7 дней)
      pool.query<{ agent_id: string; entries: string; last_active: string }>(`
        SELECT
          agent_id,
          COUNT(*)::text AS entries,
          MAX(updated_at)::text AS last_active
        FROM agent_memory
        WHERE updated_at >= NOW() - INTERVAL '7 days'
        GROUP BY agent_id
        ORDER BY MAX(updated_at) DESC
        LIMIT 13
      `),
    ]);

    const stats = statsRes.rows[0] ?? {
      total_decisions: '0', approved: '0', rejected: '0',
      pending: '0', executed: '0', this_month: '0',
    };

    return NextResponse.json(
      {
        stats: {
          totalDecisions: Number(stats.total_decisions),
          approved: Number(stats.approved),
          rejected: Number(stats.rejected),
          pending: Number(stats.pending),
          executed: Number(stats.executed),
          thisMonth: Number(stats.this_month),
        },
        recentDecisions: decisionsRes.rows.map(r => ({
          actionType: r.action_type,
          title: r.title ?? r.action_type,
          status: r.status,
          requestedBy: r.requested_by,
          executionStatus: r.execution_status ?? null,
          createdAt: r.created_at,
          reviewedAt: r.reviewed_at ?? null,
        })),
        activeAgents: agentsRes.rows.map(r => ({
          agentId: r.agent_id,
          entries: Number(r.entries),
          lastActive: r.last_active,
        })),
        updatedAt: new Date().toISOString(),
      },
      {
        headers: { 'Cache-Control': 'private, no-store' },
      }
    );
  } catch {
    return NextResponse.json(
      { stats: null, recentDecisions: [], activeAgents: [], updatedAt: new Date().toISOString(), degraded: true },
      { status: 200, headers: { 'Cache-Control': 'private, no-store' } }
    );
  }
}
