/**
 * GET /api/cron/kuzmich
 * Публикует AI-пост Кузьмича в Telegram-канал.
 *
 * Типы постов:
 *   route — маршрут дня (случайный, не повторяется 30 дней)
 *   tip   — практичный совет от Кузьмича
 *   sezon — сезонный пост про текущий месяц
 *
 * Если type не передан — выбирается по часу UTC (Камчатка UTC+12):
 *   09:00 KMT = 21:00 UTC → route
 *   14:00 KMT = 02:00 UTC → tip
 *   19:00 KMT = 07:00 UTC → sezon
 *
 * Защита: ?secret=CRON_SECRET
 *
 * Настройка cron-job.org (3 задачи):
 *   https://tourhab.ru/api/cron/kuzmich?secret=SECRET&type=route   → 21:00 UTC ежедневно
 *   https://tourhab.ru/api/cron/kuzmich?secret=SECRET&type=tip     → 02:00 UTC ежедневно
 *   https://tourhab.ru/api/cron/kuzmich?secret=SECRET&type=sezon   → 07:00 UTC ежедневно
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  postKuzmichRoute,
  postKuzmichTip,
  postSezonToChannel,
} from '@/lib/notifications/telegram-channel';

export const dynamic = 'force-dynamic';

type PostType = 'route' | 'tip' | 'sezon';

function pickTypeByHour(): PostType {
  const h = new Date().getUTCHours();
  if (h >= 20 && h <= 22) return 'route';  // 08–10 KMT
  if (h >= 1  && h <= 3)  return 'tip';    // 13–15 KMT
  if (h >= 6  && h <= 8)  return 'sezon';  // 18–20 KMT
  return 'route';
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const secret = searchParams.get('secret')
    ?? request.headers.get('authorization')?.replace('Bearer ', '');

  if (!secret || secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const typeParam = searchParams.get('type');
  const postType: PostType =
    typeParam === 'route' || typeParam === 'tip' || typeParam === 'sezon'
      ? typeParam
      : pickTypeByHour();

  let result: { ok: boolean; error?: string; routeId?: string };

  if (postType === 'route') {
    result = await postKuzmichRoute();
  } else if (postType === 'tip') {
    result = await postKuzmichTip();
  } else {
    result = await postSezonToChannel();
  }

  if (!result.ok) {
    return NextResponse.json(
      { success: false, type: postType, error: result.error },
      { status: 500 }
    );
  }

  return NextResponse.json({
    success: true,
    type: postType,
    routeId: result.routeId ?? null,
    timestamp: new Date().toISOString(),
  });
}
