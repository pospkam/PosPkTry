/**
 * GET /api/cron/group-scout
 *
 * Автономная разведка туристических Telegram-групп (MTProto / gramjs).
 * — Ищет новые туристические группы по ключевым словам
 * — AI-фильтр релевантности (0–10), вступает в подходящие (макс. 5/день)
 * — Собирает сообщения из вступивших групп → groupMonitor → agent_memory
 *
 * URL: https://tourhab.ru/api/cron/group-scout?secret=<CRON_SECRET>
 * Рекомендуемый интервал: каждые 12 часов (2 раза в день)
 */

import { NextRequest, NextResponse } from 'next/server';
import { runGroupScout } from '@/lib/telegram/group-scout';
import { timingSafeCompare } from '@/lib/security/timing-safe';

export const dynamic    = 'force-dynamic';
export const maxDuration = 300; // 5 минут — поиск + join + harvest

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

  try {
    const result = await runGroupScout();

    return NextResponse.json({
      ok:        true,
      timestamp: new Date().toISOString(),
      result,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json(
      { ok: false, error: message },
      { status: 500 }
    );
  }
}
