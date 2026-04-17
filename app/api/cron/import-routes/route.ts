/**
 * GET /api/cron/import-routes
 * Импорт знаний о маршрутах и местах Камчатки из открытых источников.
 *
 * ?source=visitkamchatka  — паспорта маршрутов (visitkamchatka.ru)
 * ?source=kamchatkaland   — тематические статьи о местах (kamchatkaland.ru)
 * ?source=all             — оба источника (по умолчанию)
 * ?batch=N                — размер батча (default 20)
 *
 * Auth: Bearer CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeCompare } from '@/lib/security/timing-safe';
import { runVisitKamchatkaImporter } from '@/lib/agents/visitkamchatka-importer';
import { runKamchatkalandImporter } from '@/lib/agents/kamchatkaland-importer';
import { runPlacesEnricher } from '@/lib/agents/places-enricher';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || !timingSafeCompare(secret, cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const source = request.nextUrl.searchParams.get('source') ?? 'all';
  const batchParam = request.nextUrl.searchParams.get('batch');
  const batch = batchParam ? Math.min(50, parseInt(batchParam, 10) || 20) : 20;

  try {
    const results: Record<string, unknown> = {};

    if (source === 'visitkamchatka' || source === 'all') {
      results.visitkamchatka = await runVisitKamchatkaImporter(batch);
    }
    if (source === 'kamchatkaland' || source === 'all') {
      results.kamchatkaland = await runKamchatkalandImporter(Math.ceil(batch / 2));
    }
    if (source === 'places' || source === 'all') {
      results.places = await runPlacesEnricher(batch);
    }

    return NextResponse.json({ success: true, ...results });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
