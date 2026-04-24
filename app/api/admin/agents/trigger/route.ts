/**
 * POST /api/admin/agents/trigger
 * Запускает агента вручную (без CRON_SECRET в браузере).
 * Требует admin JWT.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

const Schema = z.object({
  agent_id: z.enum(['watchdog', 'editor', 'scout-digest', 'scout', 'intelligence', 'evo', 'rescue']),
});

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError instanceof NextResponse) return authError;

  const body = await request.json().catch(() => ({}));
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Неверный agent_id' }, { status: 400 });
  }

  const { agent_id } = parsed.data;

  try {
    let result: Record<string, unknown>;

    if (agent_id === 'watchdog') {
      const { runWatchdog } = await import('@/lib/agents/watchdog');
      result = (await runWatchdog()) as unknown as Record<string, unknown>;
    } else if (agent_id === 'editor') {
      const { runEditor } = await import('@/lib/agents/editor');
      result = (await runEditor()) as unknown as Record<string, unknown>;
    } else if (agent_id === 'scout-digest') {
      const { runScoutDigest } = await import('@/lib/agents/scout-digest');
      result = (await runScoutDigest()) as unknown as Record<string, unknown>;
    } else if (agent_id === 'scout') {
      const { runScoutInnovator } = await import('@/lib/agents/scout-innovator');
      result = (await runScoutInnovator()) as unknown as Record<string, unknown>;
    } else if (agent_id === 'evo') {
      const { runGrowthScan } = await import('@/lib/agents/evo/growth-agent');
      const { runEvolutionLoop } = await import('@/lib/agents/evo/evolution-loop');
      const { runRescueScan } = await import('@/lib/agents/evo/rescue-agent');
      const [scan, evo, rescue] = await Promise.all([
        runGrowthScan('full'),
        runEvolutionLoop(),
        runRescueScan(),
      ]);
      result = { scan_issues: scan.issues.length, evo_processed: evo.processed, evo_auto_fixes: evo.auto_fixes, rescue_alerts: rescue.alerts.length } as unknown as Record<string, unknown>;
    } else if (agent_id === 'rescue') {
      const { runRescueScan } = await import('@/lib/agents/evo/rescue-agent');
      result = (await runRescueScan()) as unknown as Record<string, unknown>;
    } else {
      const { runIntelligenceCycle } = await import('@/lib/services/intelligence-monitor.service');
      result = (await runIntelligenceCycle()) as unknown as Record<string, unknown>;
    }

    return NextResponse.json({ ok: true, agent_id, result });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Ошибка' },
      { status: 500 }
    );
  }
}
