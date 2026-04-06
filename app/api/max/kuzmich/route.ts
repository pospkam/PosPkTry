/**
 * POST /api/max/kuzmich
 * Бот Кузьмич для MAX мессенджера (VK).
 *
 * Два режима:
 *   POST — обработка webhook-апдейтов от MAX
 *   GET  — long-polling: забирает апдейты и обрабатывает (для cron / dev)
 *
 * Env vars: MAX_BOT_TOKEN
 */

import { NextRequest, NextResponse } from 'next/server';
import { Bot, type Api } from '@maxhub/max-bot-api';
import { type PendingBooking, cleanupPending, processMessage } from '@/lib/kuzmich/core';

export const dynamic = 'force-dynamic';

// ── In-memory state ───────────────────────────────────────────────────────────

const pending = new Map<number, PendingBooking>();
setInterval(() => cleanupPending(pending), 5 * 60 * 1000);

let pollingMarker: number | null = null;

// ── MAX API client (lazy init via Bot — we don't start polling) ──────────────

let _api: Api | null = null;
function getApi(): Api | null {
  const token = process.env.MAX_BOT_TOKEN;
  if (!token) return null;
  if (!_api) {
    const bot = new Bot(token);
    _api = bot.api;
  }
  return _api;
}

// ── Reply via MAX API ─────────────────────────────────────────────────────────

async function maxReply(chatId: number, text: string): Promise<void> {
  const api = getApi();
  if (!api) return;
  try {
    await api.sendMessageToChat(chatId, text, { format: 'html' });
  } catch { /* не блокируем */ }
}

// ── Типы апдейтов MAX ────────────────────────────────────────────────────────

interface MaxUpdate {
  update_type: string;
  timestamp: number;
  // message_created
  message?: {
    sender?: { user_id: number; name: string; username?: string | null } | null;
    recipient: { chat_id: number | null; chat_type: string };
    body: { mid: string; seq: number; text: string | null };
  };
  // bot_started
  chat_id?: number;
  user?: { user_id: number; name: string; username?: string | null };
  payload?: string | null;
  // message_callback
  callback?: {
    timestamp: number;
    callback_id: string;
    payload?: string;
    user: { user_id: number; name: string };
  };
}

// ── Обработка одного апдейта ──────────────────────────────────────────────────

async function handleUpdate(update: MaxUpdate): Promise<void> {
  // bot_started → /start
  if (update.update_type === 'bot_started' && update.chat_id) {
    await processMessage({
      chatId: update.chat_id,
      text: '/start',
      userName: update.user?.name ?? null,
      userId: update.user?.user_id ?? null,
      mode: 'max',
      createdVia: 'max',
      pending,
      reply: maxReply,
    });
    return;
  }

  // message_created → текстовое сообщение
  if (update.update_type === 'message_created' && update.message) {
    const msg = update.message;
    const text = msg.body.text;
    if (!text) return;

    const chatId = msg.recipient.chat_id;
    if (!chatId) return;

    await processMessage({
      chatId,
      text: text.trim(),
      userName: msg.sender?.name ?? null,
      userId: msg.sender?.user_id ?? null,
      mode: 'max',
      createdVia: 'max',
      pending,
      reply: maxReply,
    });
    return;
  }

  // message_callback → нажатие inline-кнопки (будущее расширение)
  if (update.update_type === 'message_callback' && update.callback) {
    const api = getApi();
    if (!api) return;
    await api.answerOnCallback(update.callback.callback_id, {
      notification: 'Принято!',
    }).catch(() => {});
  }
}

// ── POST: Webhook endpoint ────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    // MAX может отправить один апдейт или массив
    const updates: MaxUpdate[] = Array.isArray(body) ? body : [body];

    for (const update of updates) {
      await handleUpdate(update);
    }
  } catch { /* всегда 200 OK */ }

  return NextResponse.json({ ok: true });
}

// ── GET: Long-polling endpoint (для cron или dev) ─────────────────────────────

export async function GET(): Promise<NextResponse> {
  const api = getApi();
  if (!api) {
    return NextResponse.json({ error: 'MAX_BOT_TOKEN not set' }, { status: 500 });
  }

  try {
    const extra: Record<string, unknown> = { limit: 50, timeout: 1 };
    if (pollingMarker) extra.marker = pollingMarker;

    const response = await api.getUpdates(
      ['message_created', 'bot_started', 'message_callback'],
      extra as Parameters<typeof api.getUpdates>[1],
    );

    pollingMarker = response.marker;

    let processed = 0;
    for (const update of response.updates) {
      await handleUpdate(update as unknown as MaxUpdate);
      processed++;
    }

    return NextResponse.json({
      ok: true,
      processed,
      marker: pollingMarker,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
