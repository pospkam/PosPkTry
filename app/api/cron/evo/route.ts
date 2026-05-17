/**
 * GET /api/cron/evo
 *
 * Evo System — параллельная оркестрация агентов.
 * Growth + Rescue + Evolver Analysis запускаются одновременно.
 * Evolution Loop — последовательно (пишет фиксы в БД).
 *
 * URL: https://tourhab.ru/api/cron/evo?secret=<CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeCompare } from '@/lib/security/timing-safe';
import { runEvoOrchestrator } from '@/lib/agents/orchestrator';
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

  const scanType = request.nextUrl.searchParams.get('type') ?? 'full';
  const startedAt = new Date();

  try {
    const result = await runEvoOrchestrator(scanType);

    void logAgentRun({
      agent_id: 'evo',
      status: result.errors.length === 0 ? 'success' : 'partial',
      started_at: startedAt,
      duration_ms: result.duration_ms,
      metadata: result as unknown as Record<string, unknown>,
    });

    const scanResult = result.scan as { issues?: Array<{ severity: string; title: string }> } | null;
    if (scanResult?.issues && scanResult.issues.length > 0) {
      void tgNotify(result);
    }

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    void logAgentRun({
      agent_id: 'evo',
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

async function tgNotify(result: { scan: unknown; evolution: unknown; rescue: unknown; errors: string[] }): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const s = result.scan as { issues?: Array<{ severity: string; title: string }>; duration_ms?: number } | null;
  const e = result.evolution as { processed?: number; auto_fixes?: number } | null;
  const r = result.rescue as { alerts?: Array<{ severity: string; title: string }> } | null;

  const issues = s?.issues ?? [];
  const critical = issues.filter(i => i.severity === 'critical' || i.severity === 'high').length;
  const rescueAlerts = (r?.alerts ?? []).filter(a => a.severity === 'critical' || a.severity === 'warning').length;

  const text = `<b>Evo Scan</b> — ${issues.length} проблем (${critical} критичных)\n` +
    `Эволюция: обработано ${e?.processed ?? 0}, автофиксов: ${e?.auto_fixes ?? 0}\n` +
    (rescueAlerts > 0 ? `<b>Спасатель: ${rescueAlerts} алертов</b>\n` : '') +
    (result.errors.length > 0 ? `Ошибки: ${result.errors.join(', ')}\n` : '') +
    `Время: ${Math.round((s?.duration_ms ?? 0) / 1000)}с`;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
  } catch { /* silent */ }
}
