/**
 * GET /api/cron/import-routes
 * Импорт паспортов маршрутов с visitkamchatka.ru
 * Auth: Bearer CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeCompare } from '@/lib/security/timing-safe';
import { runVisitKamchatkaImporter } from '@/lib/agents/visitkamchatka-importer';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || !timingSafeCompare(secret, cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const batchParam = request.nextUrl.searchParams.get('batch');
  const batch = batchParam ? Math.min(50, parseInt(batchParam, 10) || 20) : 20;

  try {
    const result = await runVisitKamchatkaImporter(batch);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
