/**
 * GET /api/agents/board-meeting/accountability
 *
 * Pre-meeting accountability assessment.
 * Shows what was decided in previous meeting and execution status.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { ExecutionTracker } from '@/lib/agents/execution/execution-tracker';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const report = await ExecutionTracker.getAccountabilityReport();
    const briefing = await ExecutionTracker.generatePreMeetingBriefing();

    return NextResponse.json({
      timestamp: new Date().toISOString(),
      briefing,
      accountability: {
        total_initiatives: report.total_initiatives,
        completion_rate_pct: report.completed_pct,
        overdue_count: report.overdue_count,
        failed_count: report.failed_count,
        blocked_count: report.blocked_count,
      },
      initiatives: report.details
        .slice(0, 10)
        .map(i => ({
          id: i.initiative_id,
          title: i.title,
          from_agent: i.from_agent_id,
          status: i.execution_status,
          days_old: i.days_elapsed,
          progress: i.progress_pct,
          issue: i.failure_reason || null,
        })),
      action_required: report.overdue_count > 0 || report.failed_count > 0,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
