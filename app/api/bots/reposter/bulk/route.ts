/**
 * POST /api/bots/reposter/bulk
 *
 * Переносит ВСЕ существующие посты из TG-канала в MAX.
 *
 * Алгоритм (обход ограничений Bot API — нет getChannelMessages):
 *   1. forwardMessage(source → dump_chat) → читаем контент из ответа
 *   2. Постим текст/фото в MAX
 *   3. deleteMessage(dump_chat, forwarded_id) — чистим личку
 *
 * Требует admin.
 *
 * Body:
 *   source_chat_id  — ID или @username исходного TG-канала
 *   dump_chat_id    — Telegram user_id куда бот будет пересылать (твой личный ID)
 *   from_id         — с какого message_id начать (обычно 1)
 *   to_id           — до какого message_id (последний видимый пост)
 *
 * Env: REPOSTER_TG_BOT_TOKEN, MAX_BOT_TOKEN, MAX_CHANNEL_ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/middleware';
import { maxPostToChannel, maxPostPhotoToChannel } from '@/lib/notifications/max-channel';

export const dynamic = 'force-dynamic';

// Telegram Bot API отвечает до 30 сообщений/сек для одного бота.
// Используем 100мс паузу для надёжности.
const DELAY_MS = 100;

const BodySchema = z.object({
  source_chat_id: z.union([z.string().min(1), z.number()]),
  dump_chat_id:   z.number({ required_error: 'dump_chat_id — твой Telegram user ID' }),
  from_id:        z.number().int().min(1).default(1),
  to_id:          z.number().int().min(1),
});

// ── Telegram API helpers ──────────────────────────────────────────────────────

function token(): string { return process.env.REPOSTER_TG_BOT_TOKEN ?? ''; }
function tgUrl(method: string) { return `https://api.telegram.org/bot${token()}/${method}`; }

interface TgPhotoSize { file_id: string; width: number; height: number }
interface TgMessage {
  message_id: number;
  text?: string;
  caption?: string;
  photo?: TgPhotoSize[];
  video?: { file_id: string };
  document?: { file_id: string };
}

async function forwardMessage(
  fromChatId: string | number,
  toChatId: number,
  messageId: number,
): Promise<TgMessage | null> {
  try {
    const res = await fetch(tgUrl('forwardMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from_chat_id: fromChatId,
        chat_id:      toChatId,
        message_id:   messageId,
      }),
    });
    const data = (await res.json()) as { ok: boolean; result?: TgMessage };
    return data.ok && data.result ? data.result : null;
  } catch {
    return null;
  }
}

async function deleteMessage(chatId: number, messageId: number): Promise<void> {
  try {
    await fetch(tgUrl('deleteMessage'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId }),
    });
  } catch { /* не блокируем */ }
}

async function getTelegramFileUrl(fileId: string): Promise<string | null> {
  try {
    const res = await fetch(`${tgUrl('getFile')}?file_id=${fileId}`);
    const data = (await res.json()) as { ok: boolean; result?: { file_path: string } };
    if (!data.ok || !data.result?.file_path) return null;
    return `https://api.telegram.org/file/bot${token()}/${data.result.file_path}`;
  } catch {
    return null;
  }
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  if (!token()) {
    return NextResponse.json({ success: false, error: 'REPOSTER_TG_BOT_TOKEN не задан' }, { status: 500 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ success: false, error: 'Неверный формат запроса' }, { status: 400 }); }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Некорректные данные' },
      { status: 400 },
    );
  }

  const { source_chat_id, dump_chat_id, from_id, to_id } = parsed.data;

  const stats = { processed: 0, skipped: 0, errors: 0, total: to_id - from_id + 1 };

  for (let msgId = from_id; msgId <= to_id; msgId++) {
    // 1. Пересылаем в личку чтобы прочитать контент
    const forwarded = await forwardMessage(source_chat_id, dump_chat_id, msgId);

    if (!forwarded) {
      // Сообщение не найдено (удалено или gap в нумерации) — пропускаем
      stats.skipped++;
      await sleep(DELAY_MS);
      continue;
    }

    const dumpMsgId = forwarded.message_id;

    // 2. Отправляем в MAX
    let maxResult: { ok: boolean; error?: string; skipped?: boolean };

    if (forwarded.text) {
      maxResult = await maxPostToChannel(forwarded.text);
    } else if (forwarded.photo && forwarded.photo.length > 0) {
      const largest = forwarded.photo[forwarded.photo.length - 1];
      const fileUrl = await getTelegramFileUrl(largest.file_id);
      const caption = forwarded.caption ?? '';
      if (fileUrl) {
        maxResult = await maxPostPhotoToChannel(fileUrl, caption);
      } else if (caption) {
        maxResult = await maxPostToChannel(caption);
      } else {
        maxResult = { ok: true, skipped: true };
      }
    } else if ((forwarded.video || forwarded.document) && forwarded.caption) {
      maxResult = await maxPostToChannel(forwarded.caption);
    } else {
      maxResult = { ok: true, skipped: true };
    }

    if (maxResult.skipped) {
      stats.skipped++;
    } else if (maxResult.ok) {
      stats.processed++;
    } else {
      stats.errors++;
    }

    // 3. Удаляем из личке
    await deleteMessage(dump_chat_id, dumpMsgId);

    await sleep(DELAY_MS);
  }

  return NextResponse.json({ success: true, stats });
}
