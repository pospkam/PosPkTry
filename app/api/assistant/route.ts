/**
 * POST /api/assistant
 *
 * Публичный AI-помощник «Твой помощник».
 * Без авторизации — используется анонимными туристами с любой страницы.
 *
 * Body: { messages: [{role, content}][], interestContext?: string }
 * Response: { reply: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { callAIWaterfall } from '@/lib/ai/providers';
import { TOURIST_PROMPT, ChatMessage } from '@/lib/ai/prompts';

export const dynamic = 'force-dynamic';

const RequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().min(1).max(2000),
  })).min(1).max(20),
  interestContext: z.string().max(300).optional(),
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

  const { messages, interestContext } = parsed.data;

  const systemContent = interestContext
    ? `${TOURIST_PROMPT}\n\nКОНТЕКСТ ИНТЕРЕСОВ ТУРИСТА: ${interestContext}`
    : TOURIST_PROMPT;

  const chatMessages: ChatMessage[] = [
    { role: 'system', content: systemContent },
    ...messages,
  ];

  try {
    const reply = await callAIWaterfall(chatMessages);
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json({ error: 'AI временно недоступен' }, { status: 503 });
  }
}
