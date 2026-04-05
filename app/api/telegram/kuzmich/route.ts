/**
 * POST /api/telegram/kuzmich
 * Публичный Telegram-бот Кузьмич — выбор тура + бронирование прямо в чате.
 *
 * Вся логика (booking flow, AI, date parsing) — в lib/kuzmich/core.ts.
 * Этот файл — только Telegram-адаптер (webhook + reply).
 *
 * Env vars: TELEGRAM_KUZMICH_BOT_TOKEN
 */

import { NextRequest, NextResponse } from 'next/server';
import { type PendingBooking, cleanupPending, processMessage } from '@/lib/kuzmich/core';

export const dynamic = 'force-dynamic';

// ── In-memory state (per-instance, TTL 30 мин) ───────────────────────────────

const pending = new Map<number, PendingBooking>();
setInterval(() => cleanupPending(pending), 5 * 60 * 1000);

// ── Telegram reply helper ─────────────────────────────────────────────────────

async function tgReply(chatId: number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_KUZMICH_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML', disable_web_page_preview: true }),
  }).catch(() => {});
}

// ── POST: Webhook ─────────────────────────────────────────────────────────────

interface TgUpdate {
  message?: { chat: { id: number }; from?: { id: number; first_name?: string }; text?: string };
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const update = await request.json() as TgUpdate;
    const msg = update.message;
    if (!msg?.text) return NextResponse.json({ ok: true });

    await processMessage({
      chatId: msg.chat.id,
      text: msg.text.trim(),
      userName: msg.from?.first_name ?? null,
      mode: 'tourist',
      createdVia: 'telegram',
      pending,
      reply: tgReply,
    });
  } catch { /* Telegram требует 200 OK всегда */ }

  return NextResponse.json({ ok: true });
}
