/**
 * POST /api/bots/reposter/webhook
 *
 * Telegram webhook — репостит посты из TG-канала в MAX-канал.
 *
 * Бот (REPOSTER_TG_BOT_TOKEN) должен быть admin-ом в исходном TG-канале.
 * Webhook регистрируется через /api/bots/reposter/setup.
 *
 * Поддерживаемые типы:
 *   text          — текстовый пост → MAX текст
 *   photo         — фото + подпись → MAX фото + подпись
 *   video/document — только подпись (текст)
 *
 * Env: REPOSTER_TG_BOT_TOKEN, REPOSTER_WEBHOOK_SECRET,
 *      MAX_BOT_TOKEN, MAX_CHANNEL_ID
 */

import { NextRequest, NextResponse } from 'next/server';
import { maxPostToChannel, maxPostPhotoToChannel } from '@/lib/notifications/max-channel';

export const dynamic = 'force-dynamic';

// ── Telegram types (минимальный набор) ────────────────────────────────────────

interface TgPhotoSize {
  file_id: string;
  file_unique_id: string;
  width: number;
  height: number;
  file_size?: number;
}

interface TgChannelPost {
  message_id: number;
  chat: { id: number; type: string; title?: string };
  date: number;
  text?: string;
  caption?: string;
  photo?: TgPhotoSize[];
  video?: { file_id: string };
  document?: { file_id: string; mime_type?: string };
  entities?: unknown[];
}

interface TgUpdate {
  update_id: number;
  channel_post?: TgChannelPost;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getBotToken(): string {
  return process.env.REPOSTER_TG_BOT_TOKEN ?? '';
}

function getWebhookSecret(): string {
  return process.env.REPOSTER_WEBHOOK_SECRET ?? '';
}

/**
 * Получить прямую ссылку на файл через Telegram File API.
 * Telegram хранит файлы до 20 МБ; ссылка действует 1 час.
 */
async function getTelegramFileUrl(fileId: string): Promise<string | null> {
  const token = getBotToken();
  if (!token) return null;
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`);
    const data = (await res.json()) as { ok: boolean; result?: { file_path: string } };
    if (!data.ok || !data.result?.file_path) return null;
    return `https://api.telegram.org/file/bot${token}/${data.result.file_path}`;
  } catch {
    return null;
  }
}

/**
 * Конвертировать Telegram HTML-entities в MAX-совместимый HTML.
 * TG и MAX поддерживают одинаковые базовые теги (<b>, <i>, <a>, <code>),
 * поэтому конвертация — это просто passthrough.
 */
function tgTextToMaxHtml(text: string): string {
  return text;
}

// ── Main handler ──────────────────────────────────────────────────────────────

export async function POST(req: NextRequest): Promise<NextResponse> {
  // 1. Проверка секрета (защита от спама)
  const secret = getWebhookSecret();
  if (secret) {
    const header = req.headers.get('X-Telegram-Bot-Api-Secret-Token') ?? '';
    if (header !== secret) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }

  const update = body as TgUpdate;

  // 2. Обрабатываем только channel_post (посты в каналах)
  const post = update.channel_post;
  if (!post) {
    // Другие типы апдейтов (inline, callback и т.д.) — игнорируем
    return NextResponse.json({ ok: true });
  }

  // 3. Определяем тип поста и репостим

  // Текстовый пост
  if (post.text) {
    const result = await maxPostToChannel(tgTextToMaxHtml(post.text));
    return NextResponse.json({ ok: result.ok, skipped: result.skipped, error: result.error });
  }

  // Пост с фото
  if (post.photo && post.photo.length > 0) {
    // Берём фото с наибольшим разрешением (последний элемент массива)
    const largest = post.photo[post.photo.length - 1];
    const fileUrl = await getTelegramFileUrl(largest.file_id);

    const caption = post.caption ? tgTextToMaxHtml(post.caption) : '';

    if (fileUrl) {
      const result = await maxPostPhotoToChannel(fileUrl, caption);
      return NextResponse.json({ ok: result.ok, skipped: result.skipped, error: result.error });
    }

    // Если не удалось получить URL фото — отправляем только подпись
    if (caption) {
      const result = await maxPostToChannel(caption);
      return NextResponse.json({ ok: result.ok, error: result.error });
    }

    return NextResponse.json({ ok: true, skipped: true, reason: 'photo without caption, file url failed' });
  }

  // Видео / документ — репостим только подпись
  if ((post.video || post.document) && post.caption) {
    const result = await maxPostToChannel(tgTextToMaxHtml(post.caption));
    return NextResponse.json({ ok: result.ok, error: result.error });
  }

  // Прочие типы (стикеры, голосовые, опросы) — пропускаем
  return NextResponse.json({ ok: true, skipped: true, reason: 'unsupported post type' });
}
