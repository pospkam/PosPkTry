/**
 * POST /api/telegram/kuzmich
 * Публичный Telegram-бот для туристов — Кузьмич.
 *
 * Любой пользователь может написать боту и получить помощь с выбором тура.
 * Бот помнит историю разговора (tg_conversations, mode='tourist').
 *
 * Env vars (Timeweb):
 *   TELEGRAM_KUZMICH_BOT_TOKEN — токен бота туристов
 *
 * Регистрация webhook:
 *   curl -X POST https://api.telegram.org/bot<TOKEN>/setWebhook \
 *     -d url=https://tourhab.ru/api/telegram/kuzmich
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { callAIWaterfall } from '@/lib/ai/providers';
import type { ChatMessage } from '@/lib/ai/prompts';

export const dynamic = 'force-dynamic';

const KUZMICH_SYSTEM = `Ты Кузьмич — камчадал в третьем поколении, проводник и главный помощник платформы TourHab на Камчатке.

Твоя задача: помочь туристу выбрать тур, маршрут или активность. Знаешь всё про регион — вулканы, рыбалку, медведей, термальные источники, вертолёты, снегоходы.

Стиль: живой, разговорный, немного ироничный как местный житель — но профессиональный и полезный. Отвечаешь кратко и по делу. Не рекламный пафос.

Если турист готов бронировать — направь на сайт: tourhab.ru/routes
Если спрашивает цены — называй диапазоны, не конкретные числа (они меняются).
Отвечай на том языке, на котором пишет турист.`;

// ── DB helpers ────────────────────────────────────────────────────────────────

async function getHistory(chatId: number): Promise<ChatMessage[]> {
  const { rows } = await pool.query<{ role: string; content: string }>(
    `SELECT role, content
     FROM tg_conversations
     WHERE chat_id = $1 AND mode = 'tourist'
     ORDER BY created_at DESC
     LIMIT 20`,
    [chatId]
  );
  return rows.reverse() as ChatMessage[];
}

async function saveMessage(
  chatId: number,
  role: 'user' | 'assistant',
  content: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO tg_conversations (chat_id, mode, role, content) VALUES ($1, 'tourist', $2, $3)`,
    [chatId, role, content],
  );
}

// ── Telegram helper ───────────────────────────────────────────────────────────

async function reply(chatId: number, text: string): Promise<void> {
  const token = process.env.TELEGRAM_KUZMICH_BOT_TOKEN;
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  }).catch(() => {});
}

// ── Update type ───────────────────────────────────────────────────────────────

interface TgUpdate {
  message?: {
    chat: { id: number };
    from?: { id: number; first_name?: string };
    text?: string;
  };
}

// ── POST: Webhook ─────────────────────────────────────────────────────────────

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const update = await request.json() as TgUpdate;
    const msg = update.message;
    if (!msg?.text) return NextResponse.json({ ok: true });

    const chatId = msg.chat.id;
    const text = msg.text.trim();
    const cmd = text.split(' ')[0]?.toLowerCase() ?? '';

    // /start
    if (cmd === '/start') {
      const name = msg.from?.first_name ?? 'турист';
      await reply(
        chatId,
        `Привет, ${name}! Я Кузьмич — помогу подобрать тур или маршрут на Камчатке.\n\nПросто напиши что хочешь: рыбалка, вулканы, медведи, термальные источники, вертолётная экскурсия...\n\n<a href="https://tourhab.ru/routes">Смотреть все маршруты →</a>`,
      );
      return NextResponse.json({ ok: true });
    }

    // /help
    if (cmd === '/help') {
      await reply(
        chatId,
        `Пиши что интересует — подберу варианты.\n\nПримеры:\n• "3 дня, хочу рыбалку и вулкан"\n• "что лучше делать в июле"\n• "туры для компании 4 человека"\n• "бюджет 20 тысяч на человека"\n\n<a href="https://tourhab.ru/routes">Все маршруты →</a>`,
      );
      return NextResponse.json({ ok: true });
    }

    // /reset — очистить историю разговора
    if (cmd === '/reset') {
      await pool.query(
        `DELETE FROM tg_conversations WHERE chat_id = $1 AND mode = 'tourist'`,
        [chatId],
      );
      await reply(chatId, 'История очищена. Начнём заново — что интересует?');
      return NextResponse.json({ ok: true });
    }

    // Свободный текст — диалог с Кузьмичом
    await saveMessage(chatId, 'user', text);
    const history = await getHistory(chatId);

    const messages: ChatMessage[] = [
      { role: 'system', content: KUZMICH_SYSTEM },
      ...history,
    ];

    const response = await callAIWaterfall(messages);
    const safeResponse = response?.trim() || 'Что-то с сигналом... Попробуй ещё раз.';

    await saveMessage(chatId, 'assistant', safeResponse);
    await reply(chatId, safeResponse);
  } catch {
    // не прерываем — Telegram требует 200 OK всегда
  }

  return NextResponse.json({ ok: true });
}
