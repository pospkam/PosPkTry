/**
 * POST /api/admin/telegram/channel-post
 *
 * Публикует маршрут или оператора в Telegram-канал (TELEGRAM_CHANNEL_ID).
 *
 * Body:
 *   { type: 'route',    id: string  }   — по ID маршрута
 *   { type: 'operator', slug: string }  — по slug оператора
 *
 * Требует: роль admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/middleware';
import { postRouteToChannel, postOperatorToChannel } from '@/lib/notifications/telegram-channel';

const BodySchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('route'),    id:   z.string().uuid(), photoUrl: z.string().url().optional() }),
  z.object({ type: z.literal('operator'), slug: z.string().min(1).max(100), photoUrl: z.string().url().optional() }),
]);

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError instanceof NextResponse) return authError;

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: 'Неверный формат запроса' }, { status: 400 }); }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Некорректные данные' },
      { status: 400 }
    );
  }

  const result = parsed.data.type === 'route'
    ? await postRouteToChannel(parsed.data.id, parsed.data.photoUrl)
    : await postOperatorToChannel(parsed.data.slug, parsed.data.photoUrl);

  if (!result.ok) {
    return NextResponse.json({ success: false, error: result.error ?? 'Telegram error' }, { status: 502 });
  }
  return NextResponse.json({ success: true });
}
