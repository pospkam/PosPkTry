/**
 * GET  /api/agents/intelligence — view latest intelligence findings
 * POST /api/agents/intelligence — trigger manual intelligence cycle
 *
 * Requires admin auth.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { getLatestIntelligence, runIntelligenceCycle, injectManualIntel } from '@/lib/services/intelligence-monitor.service';
import { agentMemory } from '@/lib/agents/memory/agent-memory';
import { z } from 'zod';

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

const InjectSchema = z.object({
  content: z.string().min(10).max(10000),
  topic: z.string().min(1).max(200),
  domain: z.enum(['ai_tech', 'travel_industry', 'competitors']).optional().default('ai_tech'),
});

/**
 * PATCH /api/agents/intelligence
 * Ручная инъекция сигнала (статья, новость, инсайт) в agent_memory.
 * Scout подхватит на следующем прогоне и сгенерирует предложения.
 */
export async function PATCH(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (authResult instanceof NextResponse) return authResult;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = InjectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Validation error', details: parsed.error.flatten() }, { status: 400 });
  }

  const { content, topic, domain } = parsed.data;
  const result = await injectManualIntel(content, topic, domain);

  return NextResponse.json({
    ok: result.ok,
    key: result.key,
    domain: result.domain,
    urgency: result.urgency,
    summary: result.summary,
    action_items: result.action_items,
    note: 'Сигнал сохранён. Scout подхватит на следующем прогоне (06:00 UTC) или запустите /api/cron/scout вручную.',
  });
}
