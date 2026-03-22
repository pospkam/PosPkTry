/**
 * POST /api/planner/companion
 *
 * AI-powered trip companion chat. Receives the user's question along with
 * the current trip context (days, zones, activities) and returns a
 * conversational reply in Russian.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { callAIWaterfall } from '@/lib/ai/providers';
import type { ChatMessage } from '@/lib/ai/prompts';

export const dynamic = 'force-dynamic';

const BodySchema = z.object({
  message: z.string().min(1).max(500),
  context: z.string().max(2000).default(''),
});

const COMPANION_SYSTEM = `Ты -- персональный помощник путешественника на платформе TourHab (Камчатка).
У тебя есть контекст текущего маршрута пользователя (ниже).

Правила:
- Отвечай кратко (2-4 предложения), по делу, на русском
- Без эмодзи, без markdown-ссылок
- Если вопрос о погоде -- дай общий совет по сезону (июнь-сентябрь: +10..+20, дожди; зима: -15..-25)
- Если вопрос о снаряжении -- дай конкретный список для активности
- Если вопрос о ценах -- назови диапазон, уточни что точные цены у оператора
- Если спрашивают про переезды между зонами -- Авачинская и Западная/Восточная: 5-7 часов на джипе; Северная: только вертолёт
- Если вопрос не связан с путешествием -- вежливо верни к теме планирования
- Если маршрут содержит проблемы (не в сезон, опасно для детей) -- предупреди`;

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: 'Некорректный JSON' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Сообщение обязательно' }, { status: 400 });
  }

  const { message, context } = parsed.data;

  const userContent = context
    ? `Контекст маршрута:\n${context}\n\nВопрос: ${message}`
    : message;

  const messages: ChatMessage[] = [
    { role: 'system', content: COMPANION_SYSTEM },
    { role: 'user', content: userContent },
  ];

  try {
    const reply = await callAIWaterfall(messages);
    return NextResponse.json({ success: true, reply });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Сервис временно недоступен' },
      { status: 503 },
    );
  }
}
