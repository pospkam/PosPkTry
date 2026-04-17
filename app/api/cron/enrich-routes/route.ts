/**
 * GET /api/cron/enrich-routes
 *
 * Cron-триггер для обогащения маршрутов-призраков.
 * Вызывается cron-job.org каждые 6 часов.
 * Обогащает 10 маршрутов за раз (чтобы не убить AI rate limit).
 *
 * Auth: CRON_SECRET header
 */

import { NextRequest, NextResponse } from 'next/server';
import { timingSafeCompare } from '@/lib/security/timing-safe';

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://tourhab.ru';

export async function GET(request: NextRequest) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '');
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: 'CRON_SECRET not configured' }, { status: 500 });
  }
  if (!timingSafeCompare(secret, cronSecret)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Call the enrichment API internally
    const res = await fetch(`${BASE_URL}/api/admin/enrich-routes`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': cronSecret,
      },
      body: JSON.stringify({ mode: 'description', batch: 20, dryRun: false }),
    });

    const data = await res.json();
    return NextResponse.json(data);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
