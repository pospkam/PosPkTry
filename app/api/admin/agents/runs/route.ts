/**
 * GET /api/admin/agents/runs
 * Возвращает историю запусков агентов из agent_run_history.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

interface RunRow {
  id: string;
  agent_id: string;
  status: string;
  started_at: string;
  duration_ms: number | null;
  items_processed: number | null;
  errors_count: number;
  error_msg: string | null;
  metadata: Record<string, unknown> | null;
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError instanceof NextResponse) return authError;

  const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '50'), 100);
  const agentId = request.nextUrl.searchParams.get('agent_id') ?? null;

  try {
    const { rows } = await pool.query<RunRow>(
      `SELECT id, agent_id, status,
              started_at::text, duration_ms,
              items_processed, errors_count, error_msg, metadata
       FROM agent_run_history
       WHERE ($1::text IS NULL OR agent_id = $1)
       ORDER BY started_at DESC
       LIMIT $2`,
      [agentId, limit]
    );

    // Per-agent last status summary
    const { rows: summary } = await pool.query<{ agent_id: string; status: string; started_at: string }>(
      `SELECT DISTINCT ON (agent_id)
              agent_id, status, started_at::text
       FROM agent_run_history
       ORDER BY agent_id, started_at DESC`
    );

    return NextResponse.json({ runs: rows, summary });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Ошибка БД' },
      { status: 500 }
    );
  }
}
