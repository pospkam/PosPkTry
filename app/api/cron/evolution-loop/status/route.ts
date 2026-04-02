/**
 * GET /api/cron/evolution-loop/status
 *
 * Public endpoint — последние результаты эволюции
 * Доступно всем, no auth required
 * Используется для feedback loop в Claude Code
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    // Последний запуск evolution loop
    const lastRun = await pool.query(
      `SELECT
         created_at,
         metadata->>'status' as status,
         metadata->>'initiatives_processed' as initiatives_count,
         metadata->>'duration_ms' as duration_ms,
         metadata
       FROM ai_actions_log
       WHERE action_type = 'evolution_loop'
       ORDER BY created_at DESC
       LIMIT 1`
    );

    // Все инициативы из последних 2 часов
    const initiatives = await pool.query(
      `SELECT
         id,
         created_at,
         type,
         description,
         approval_status,
         execution_status,
         context->>'from_name' as from_agent,
         executor_name
       FROM agent_approvals
       WHERE created_at > NOW() - INTERVAL '2 hours'
       ORDER BY created_at DESC
       LIMIT 20`
    );

    // Board meeting состояние
    const lastMeeting = await pool.query(
      `SELECT
         created_at,
         metadata->>'intent' as intent,
         metadata->>'agents_ok' as agents_ok,
         metadata->>'duration_ms' as duration_ms,
         metadata->>'result' as result
       FROM ai_actions_log
       WHERE action_type = 'agent_board-meeting'
       AND (metadata->>'intent') = 'board_meeting'
       ORDER BY created_at DESC
       LIMIT 1`
    );

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      last_evolution_run: lastRun.rows[0] || null,
      recent_initiatives: initiatives.rows,
      last_board_meeting: lastMeeting.rows[0] || null,
      status: 'operational',
    });
  } catch (e) {
    return NextResponse.json(
      {
        timestamp: new Date().toISOString(),
        error: e instanceof Error ? e.message : String(e),
        status: 'error',
      },
      { status: 500 }
    );
  }
}
