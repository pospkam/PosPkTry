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
} from '@/lib/notifications/telegram-channel';
import { z } from 'zod';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const Schema = z.object({
  type: z.enum(['kuzmich_route', 'tip', 'sezon', 'safety']),
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

    switch (type) {
      case 'kuzmich_route': result = await postKuzmichRoute(); break;
      case 'tip':           result = await postKuzmichTip();   break;
      case 'sezon':         result = await postSezonToChannel(); break;
      case 'safety':        result = await postSafetyToChannel(topic); break;
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

  const channelId = process.env.TELEGRAM_CHANNEL_ID;
  const maxChannelId = process.env.MAX_CHANNEL_ID;
  const tgLink = process.env.TELEGRAM_CHANNEL_LINK;
  const maxLink = process.env.MAX_CHANNEL_LINK;

  return NextResponse.json({
    telegram: {
      configured: !!channelId,
      channel_id: channelId ? '✓ задан' : null,
      channel_link: tgLink ?? null,
    },
    max: {
      configured: !!maxChannelId,
      channel_id: maxChannelId ? '✓ задан' : null,
      channel_link: maxLink ?? null,
    },
  });
}
