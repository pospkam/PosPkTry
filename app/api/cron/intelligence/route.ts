/**
 * GET /api/cron/intelligence
 *
 * Automated intelligence monitoring — runs every 6 hours.
 * Scans 3 domains: AI/Tech, Travel Industry, Competitors.
 * Stores findings in agent_memory, sends critical to Telegram.
 *
 * URL: https://tourhab.ru/api/cron/intelligence?secret=<CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { runIntelligenceCycle } from '@/lib/services/intelligence-monitor.service';
import { timingSafeCompare } from '@/lib/security/timing-safe';
import { logAgentRun } from '@/lib/agents/run-logger';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

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

  try {
    const startedAt = new Date();
    const report = await runIntelligenceCycle();

    // Log to run history
    await logAgentRun({
      agent_id: 'intelligence',
      status: report.domains.length > 0 ? 'success' : 'partial',
      started_at: startedAt,
      duration_ms: report.duration_ms,
      items_processed: report.raw_count,
      items_created: report.domains.length,
      errors_count: 0,
      metadata: {
        domains: report.domains.map(d => ({
          domain: d.domain,
          urgency: d.urgency,
          signals: d.signals.length,
        })),
      },
    });

    // Log to audit trail
    await pool.query(
      `INSERT INTO ai_actions_log (action_type, metadata) VALUES ($1, $2)`,
      [
        'intelligence_cycle',
        JSON.stringify({
          decision: 'intelligence_monitoring',
          result: 'success',
          duration_ms: report.duration_ms,
          raw_signals: report.raw_count,
          findings: report.domains.length,
          domains: report.domains.map(d => ({
            domain: d.domain,
            urgency: d.urgency,
            signals: d.signals.length,
            actions: d.action_items.length,
          })),
        }),
      ]
    );

    return NextResponse.json({
      ok: true,
      timestamp: report.timestamp,
      raw_signals: report.raw_count,
      findings: report.domains.length,
      duration_ms: report.duration_ms,
      domains: report.domains.map(d => ({
        domain: d.domain,
        urgency: d.urgency,
        summary: d.summary,
        action_items: d.action_items,
      })),
    });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    await logAgentRun({
      agent_id: 'intelligence',
      status: 'failed',
      started_at: new Date(),
      duration_ms: 0,
      errors_count: 1,
      error_msg: errMsg,
    });
    return NextResponse.json({ ok: false, error: errMsg }, { status: 500 });
  }
}
