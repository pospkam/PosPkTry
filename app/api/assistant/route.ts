/**
 * /api/assistant — публичный AI-помощник «AI-помощник Камчатки»
 *
 * GET  ?sessionId=X  → история сессии (для восстановления при возврате)
 * POST              → ответ AI + сохранение в chat_sessions (fire-and-forget)
 *
 * Анонимные пользователи получают sessionId, который живёт в localStorage.
 * При регистрации chat_sessions.user_id заполняется — история остаётся.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { callAIWaterfall } from '@/lib/ai/providers';
import { TOURIST_PROMPT, ChatMessage } from '@/lib/ai/prompts';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

// ── Типы ──────────────────────────────────────────────────────────────────────

interface StoredMessage {
  role: 'user' | 'assistant';
  content: string;
}

// ── GET — загрузка истории сессии ─────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const sessionId = searchParams.get('sessionId');
  if (!sessionId) return NextResponse.json({ messages: [] });

  try {
    const result = await query<{ messages: StoredMessage[] }>(
      `SELECT messages FROM chat_sessions WHERE session_id = $1 LIMIT 1`,
      [sessionId],
    );
    const messages: StoredMessage[] = result.rows[0]?.messages ?? [];
    return NextResponse.json({ messages });
  } catch {
    return NextResponse.json({ messages: [] });
  }
}

// ── POST — ответ AI + сохранение ─────────────────────────────────────────────

const RequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(2000),
  })).min(1).max(30),
  interestContext: z.string().max(300).optional(),
  sessionId: z.string().max(100).optional(),
});

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Неверный формат запроса' }, { status: 400 });
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Некорректные данные' },
      { status: 400 },
    );
  }

  const { messages, interestContext, sessionId } = parsed.data;

  // Системный промпт с контекстом интересов
  const systemContent = interestContext
    ? `${TOURIST_PROMPT}\n\nКОНТЕКСТ ИНТЕРЕСОВ ТУРИСТА: ${interestContext}`
    : TOURIST_PROMPT;

  const chatMessages: ChatMessage[] = [
    { role: 'system', content: systemContent },
    ...messages.slice(-8), // последние 8 = 4 обмена
  ];

  let reply: string;
  try {
    reply = await callAIWaterfall(chatMessages);
  } catch {
    return NextResponse.json({ error: 'AI временно недоступен' }, { status: 503 });
  }

  // Сохраняем в БД (fire-and-forget — не блокируем ответ)
  if (sessionId) {
    const fullHistory: StoredMessage[] = [
      ...(messages as StoredMessage[]),
      { role: 'assistant' as const, content: reply },
    ].slice(-30); // храним не больше 30 сообщений

    query(
      `INSERT INTO chat_sessions (session_id, role, messages, updated_at)
       VALUES ($1, 'tourist', $2::jsonb, NOW())
       ON CONFLICT (session_id) DO UPDATE
         SET messages = $2::jsonb, updated_at = NOW()`,
      [sessionId, JSON.stringify(fullHistory)],
    ).catch(() => { /* не критично */ });
  }

  return NextResponse.json({ reply, sessionId: sessionId ?? null });
}
