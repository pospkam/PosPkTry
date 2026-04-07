/**
 * app/api/cron/routes-cache-refresh/route.ts
 * 
 * Обновляет AI-описания для маршрутов без кеша.
 * Запускается через GitHub Actions или cron-job.org ежедневно.
 * 
 * Используется для SEO: гарантирует свежесть описаний в кешe для Google.
 */

import { NextRequest, NextResponse } from 'next/server';
import { refreshRoutesWithoutCache } from '@/lib/services/route-description-cache';

const CRON_SECRET = process.env.CRON_SECRET || '';

export async function POST(req: NextRequest) {
  // Verify cron secret
  const auth = req.headers.get('authorization');
  if (!auth || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const limit = parseInt(req.nextUrl.searchParams.get('limit') || '50', 10);
    const updated = await refreshRoutesWithoutCache(limit);

    const message = `Routes description cache refreshed: ${updated} routes`;
    if (process.env.NODE_ENV !== 'production') {
      console.info('[routes-cache] ' + message);
    }

    return NextResponse.json({
      success: true,
      updated,
      message: `Refreshed ${updated} route descriptions`,
    });
  } catch (error) {
    const message = `Route description cache refresh failed: ${error instanceof Error ? error.message : String(error)}`;
    if (process.env.NODE_ENV !== 'production') {
      console.error('[routes-cache] ' + message);
    }

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
