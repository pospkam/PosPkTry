/**
 * POST /api/safety/rescue-chat
 * Чат с AI Спасателем — доступен всем аутентифицированным пользователям.
 * Туристы, операторы, гиды могут получить экстренную консультацию.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { callAIWithModelDirect } from '@/lib/ai/providers';
import { getModelForAgent } from '@/lib/ai/agent-models';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { z } from 'zod';
import type { ChatMessage } from '@/lib/ai/prompts';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const limiter = createRateLimiter({ windowMs: 60_000, max: 15 });

const BodySchema = z.object({
  message: z.string().min(1, 'Сообщение не может быть пустым').max(800, 'Сообщение слишком длинное'),
  history: z.array(
    z.object({
      role: z.enum(['user', 'assistant', 'system']),
      content: z.string(),
    })
  ).max(20).optional().default([]),
});

const SYSTEM_PROMPT =
  'Ты — AI Спасатель Камчатки, виртуальный ассистент по безопасности туристов. ' +
  'Консультируй по экстренным ситуациям, правилам безопасности на природе, ' +
  'действиям при землетрясениях, извержениях вулканов, медведях, непогоде. ' +
  'Всегда напоминай звонить 112 при реальной угрозе жизни. ' +
  'Отвечай на русском языке, кратко и чётко. ' +
  'Никогда не заменяй реальные экстренные службы — только консультируй.';

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  if (!limiter.check(ip)) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Подождите минуту.' },
      { status: 429 }
    );
  }

  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: 'Неверный формат запроса' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message || 'Ошибка валидации' },
      { status: 400 }
    );
  }

  const { message, history } = parsed.data;

  const messages: ChatMessage[] = [
    { role: 'system', content: SYSTEM_PROMPT },
    ...history.slice(-10),
    { role: 'user', content: message },
  ];

  let reply: string;
  try {
    reply = await callAIWithModelDirect(messages, getModelForAgent('rescue'));
  } catch {
    return NextResponse.json(
      { error: 'AI Спасатель временно недоступен. При реальной угрозе звоните 112.' },
      { status: 503 }
    );
  }

  return NextResponse.json({ reply });
}
