/**
 * GET /api/cron/evo
 *
 * Evo System — Growth Scan + Evolution Loop.
 * Запускает диагностику проекта и применяет фиксы.
 *
 * URL: https://tourhab.ru/api/cron/evo?secret=<CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeCompare } from '@/lib/security/timing-safe';
import { runGrowthScan } from '@/lib/agents/evo/growth-agent';
import { runEvolutionLoop } from '@/lib/agents/evo/evolution-loop';
import { runRescueScan } from '@/lib/agents/evo/rescue-agent';
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
    // 1. Growth Scan — диагностика
    const scanResult = await runGrowthScan(scanType);

    // 2. Evolution Loop — применяем фиксы
    const evoResult = await runEvolutionLoop();

    // 3. Rescue Scan — проактивная безопасность
    const rescueResult = await runRescueScan();

    // Log
    void logAgentRun({
      agent_id: 'evo',
      status: 'success',
      started_at: startedAt,
      duration_ms: Date.now() - startedAt.getTime(),
      metadata: {
        scan: scanResult,
        evolution: evoResult,
        rescue: rescueResult,
      } as unknown as Record<string, unknown>,
    });

    // Telegram notification if issues found
    if (scanResult.issues.length > 0) {
      void tgNotify(scanResult, evoResult, rescueResult);
    }

    return NextResponse.json({
      success: true,
      scan: scanResult,
      evolution: evoResult,
      rescue: rescueResult,
    });
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

async function tgNotify(scan: unknown, evo: unknown, rescue: unknown): Promise<void> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const s = scan as { issues: Array<{ severity: string; title: string }>; duration_ms: number };
  const e = evo as { processed: number; auto_fixes: number };
  const r = rescue as { alerts: Array<{ severity: string; title: string }> };

  const critical = s.issues.filter(i => i.severity === 'critical' || i.severity === 'high').length;
  const rescueAlerts = r.alerts.filter(a => a.severity === 'critical' || a.severity === 'warning').length;
  const text = `<b>Evo Scan</b> — ${s.issues.length} проблем (${critical} критичных)\n` +
    `Эволюция: обработано ${e.processed}, автофиксов: ${e.auto_fixes}\n` +
    (rescueAlerts > 0 ? `<b>Спасатель: ${rescueAlerts} алертов</b>\n` : '') +
    `Время: ${Math.round(s.duration_ms / 1000)}с`;

  try {
    await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
    });
  } catch { /* silent */ }
}
