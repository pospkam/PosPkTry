/**
 * GET /api/cron/scout
 *
 * Разведчик-Новатор — ежедневный запуск.
 * Читает разведданные из agent_memory, генерирует эволюционные предложения,
 * сохраняет в agent_approvals для одобрения владельцем.
 *
 * Запуск: cron-job.org раз в сутки
 *   URL: https://tourhab.ru/api/cron/scout?secret=<CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server';
import { ScoutInnovatorAgency } from '@/lib/agents/agencies/scout-innovator-agency';

export const dynamic     = 'force-dynamic';
export const maxDuration = 120;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }

  const secret = req.nextUrl.searchParams.get('secret')
    ?? req.headers.get('authorization')?.replace('Bearer ', '');

  if (secret !== cronSecret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const agency = new ScoutInnovatorAgency();
    const report = await agency.run();

    return NextResponse.json({
      ok:             true,
      intel_sources:  report.intel_sources,
      proposals:      report.proposals.length,
      duration_ms:    report.duration_ms,
      generated_at:   report.generated_at,
      synthesis:      report.synthesis.substring(0, 300),
    });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : 'Неизвестная ошибка' },
      { status: 500 }
    );
  }
}
