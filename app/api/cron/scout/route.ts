/**
 * GET /api/cron/scout
 *
 * Scout-Innovator — ежедневный синтез разведданных → конкретные предложения.
 * Запускается через cron-scout.yml в 06:00 UTC (после intelligence monitor).
 *
 * URL: https://tourhab.ru/api/cron/scout?secret=<CRON_SECRET>
 */

import { NextRequest, NextResponse } from 'next/server';
import { runScoutInnovator } from '@/lib/agents/scout-innovator';
import { timingSafeCompare } from '@/lib/security/timing-safe';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const secret =
    request.nextUrl.searchParams.get('secret') ??
    request.headers.get('authorization')?.replace('Bearer ', '');

  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  if (!timingSafeCompare(secret, cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await runScoutInnovator();
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error('[cron/scout] Unhandled error:', errMsg);
    return NextResponse.json({ ok: false, error: errMsg }, { status: 500 });
  }
}
