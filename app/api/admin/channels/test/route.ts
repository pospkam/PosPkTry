/**
 * POST /api/admin/channels/test
 * Тест-публикация в каналы (Telegram + MAX) без cron.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import {
  postKuzmichRoute,
  postKuzmichTip,
  postSezonToChannel,
  postSafetyToChannel,
  postAINewsToChannel,
} from '@/lib/notifications/telegram-channel';
import type { IntelligenceFinding } from '@/lib/services/intelligence-monitor.service';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const Schema = z.object({
  type: z.enum(['kuzmich_route', 'tip', 'sezon', 'safety', 'ai_news']),
  topic: z.string().optional(),
});

export async function POST(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: 'Bad JSON' }, { status: 400 }); }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: parsed.error.message }, { status: 400 });

  const { type, topic } = parsed.data;

  try {
    let result: { ok: boolean; error?: string; routeId?: string };

    if (type === 'ai_news') {
      // Тестовый AI-finding для проверки канала
      const testFinding: IntelligenceFinding = {
        domain: 'ai_tech',
        summary: topic || 'Тест публикации AI-новостей: проверка работы канала и форматирования постов.',
        signals: [{
          title: 'Тестовый сигнал',
          source: 'tourhab.ru',
          url: 'https://tourhab.ru',
          snippet: 'Это тестовая публикация для проверки канала AI-новостей.',
        }],
        urgency: 'notable',
        action_items: ['Проверить оформление поста', 'Убедиться что фото загружается'],
      };
      result = await postAINewsToChannel(testFinding);
    } else {
      switch (type) {
        case 'kuzmich_route': result = await postKuzmichRoute(); break;
        case 'tip':           result = await postKuzmichTip();   break;
        case 'sezon':         result = await postSezonToChannel(); break;
        case 'safety':        result = await postSafetyToChannel(topic); break;
        default:              result = { ok: false, error: 'Unknown type' };
      }
    }

    return NextResponse.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ошибка';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest): Promise<NextResponse> {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json({
    tourhab_channel: {
      configured: !!process.env.TELEGRAM_CHANNEL_ID,
      link: process.env.TELEGRAM_CHANNEL_LINK ?? null,
    },
    ai_news_channel: {
      configured: !!process.env.TELEGRAM_AI_CHANNEL_ID,
      link: process.env.TELEGRAM_AI_CHANNEL_LINK ?? null,
    },
    max_channel: {
      configured: !!process.env.MAX_CHANNEL_ID,
      link: process.env.MAX_CHANNEL_LINK ?? null,
    },
  });
}
