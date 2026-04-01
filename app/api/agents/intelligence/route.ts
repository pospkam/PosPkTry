/**
 * GET  /api/agents/intelligence — view latest intelligence findings
 * POST /api/agents/intelligence — trigger manual intelligence cycle
 *
 * Requires admin auth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { getLatestIntelligence, runIntelligenceCycle } from '@/lib/services/intelligence-monitor.service';
import { agentMemory } from '@/lib/agents/memory/agent-memory';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  const memories = await agentMemory.recall('evo', 'intelligence', 20);

  const findings = memories.map(m => {
    const v = m.value as Record<string, unknown>;
    return {
      domain: v.domain,
      summary: v.summary,
      urgency: v.urgency,
      action_items: v.action_items,
      signal_count: v.signal_count,
      updated_at: m.updated_at,
    };
  });

  const summary = await getLatestIntelligence();

  return NextResponse.json({
    ok: true,
    count: findings.length,
    summary,
    findings,
  });
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  const report = await runIntelligenceCycle();

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
}
