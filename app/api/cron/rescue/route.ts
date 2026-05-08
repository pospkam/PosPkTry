/**
 * GET /api/cron/rescue
 *
 * Proactive Rescue Agent — мониторит безопасность каждые 30 мин.
 * Проверяет: SOS, погоду, бронирования, операторов.
 *
 * URL: https://tourhab.ru/api/cron/rescue?secret=<CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeCompare } from '@/lib/security/timing-safe';
import { runRescueScan } from '@/lib/agents/evo/rescue-agent';
import { logAgentRun } from '@/lib/agents/run-logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function GET(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get('secret')
    ?? request.headers.get('authorization')?.replace('Bearer ', '');

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  if (!timingSafeCompare(secret, cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const startedAt = new Date();

  try {
    const result = await runRescueScan();

    void logAgentRun({
      agent_id: 'rescue',
      status: result.alerts.some(a => a.severity === 'critical') ? 'partial' : 'success',
      started_at: startedAt,
      duration_ms: Date.now() - startedAt.getTime(),
      metadata: result as unknown as Record<string, unknown>,
    });

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    void logAgentRun({
      agent_id: 'rescue',
      status: 'failed',
      started_at: startedAt,
      duration_ms: Date.now() - startedAt.getTime(),
      errors_count: 1,
      error_msg: err instanceof Error ? err.message : String(err),
    });

    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
