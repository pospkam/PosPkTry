/**
 * GET /api/agents/experiments/sessions?experiment_id=
 * Агрегированная статистика SDK-сессий по эксперименту
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

interface SessionRow {
  variant:          string;
  count:            string;
  avg_duration_ms:  string;
  avg_tool_calls:   string;
  success_rate:     string;
}

export async function GET(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const experimentId = req.nextUrl.searchParams.get('experiment_id');
  if (!experimentId) {
    return NextResponse.json({ success: false, error: 'experiment_id required' }, { status: 400 });
  }

  try {
    const { rows } = await pool.query<SessionRow>(`
      SELECT
        variant,
        COUNT(*)::text                                                           AS count,
        ROUND(AVG(duration_ms))::text                                           AS avg_duration_ms,
        ROUND(AVG(tool_calls_count), 1)::text                                   AS avg_tool_calls,
        ROUND(
          COUNT(*) FILTER (WHERE outcome = 'success')::numeric / NULLIF(COUNT(*), 0), 3
        )::text                                                                  AS success_rate
      FROM agent_sdk_sessions
      WHERE experiment_id = $1
      GROUP BY variant
      ORDER BY variant
    `, [experimentId]);

    return NextResponse.json({
      success: true,
      data: rows.map(r => ({
        variant:         r.variant,
        count:           parseInt(r.count, 10),
        avg_duration_ms: parseFloat(r.avg_duration_ms ?? '0'),
        avg_tool_calls:  parseFloat(r.avg_tool_calls ?? '0'),
        success_rate:    parseFloat(r.success_rate ?? '0'),
      })),
    });
  } catch {
    // Таблица ещё не создана — вернём пустой массив
    return NextResponse.json({ success: true, data: [] });
  }
}
