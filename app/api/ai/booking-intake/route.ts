import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiResponse } from '@/types';
import { requireOperator } from '@/lib/auth/middleware';
import { callAIWithModelDirect } from '@/lib/ai/providers';
import { getModelForAgent } from '@/lib/ai/agent-models';
import type { ChatMessage } from '@/lib/ai/prompts';
import { query } from '@/lib/database';
import { emitEvent, AGENT_EVENTS } from '@/lib/events/emit';
import { createLead } from '@/lib/leads/create';
// Утилита для обогащения контекста AI описаниями туров из внешних источников
export { fetchAsMarkdown } from '@/lib/ai/fetchAsMarkdown';

export const dynamic = 'force-dynamic';

const intakeSchema = z.object({
  message: z.string().min(1).max(5000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).max(50).default([]),
});

// Системный промпт AI-агента приёма заявок (на русском, только Камчатка)
const SYSTEM_PROMPT = `Ты помощник туристического оператора на Камчатке.
Принимаешь заявки от туристов 24/7.
Уточняешь: даты, количество людей, бюджет, интересы.
Если опасность -- сразу: SOS и МЧС 112.
Только Камчатка, только безопасный туризм.
Отвечай кратко и по делу. Язык ответа = язык вопроса.`;

/**
 * POST /api/ai/booking-intake
 * AI-агент приёма заявок на туры.
 * Доступен только операторам для тестирования.
 * Использует shared AI waterfall провайдеры.
 * Сохраняет лид в leads таблице.
 */
export async function POST(request: NextRequest) {
  try {
    const userOrResponse = await requireOperator(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;

    const payload: unknown = await request.json();
    const validation = intakeSchema.safeParse(payload);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues } as unknown as ApiResponse<null>,
        { status: 400 }
      );
    }

    const { message, history } = validation.data;

    // Формируем массив сообщений для AI
    const messages: ChatMessage[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.map(h => ({ role: h.role as 'user' | 'assistant', content: h.content })),
      { role: 'user', content: message },
    ];

    let reply: string;
    let provider: string;

    try {
      reply = await callAIWithModelDirect(messages, getModelForAgent('operator'));
      provider = 'waterfall';
    } catch {
      // Fallback: если все провайдеры недоступны
      reply = 'Спасибо за обращение! Наш оператор свяжется с вами в ближайшее время. Для срочных вопросов: +7 914-782-22-22. При опасности звоните 112 (МЧС).';
      provider = 'fallback';
    }

    // Persist lead in database (fire-and-forget)
    void createLead({
      name: 'Booking Intake Bot',
      phone: '',
      comment: message.slice(0, 500),
      source_url: '/api/ai/booking-intake',
      source_data: {
        source: 'booking_intake_bot',
        history_length: history.length,
        provider,
      },
      status: 'new',
    }).catch((err) => console.error('[booking-intake] createLead failed:', err));

    // Emit booking intent event (fire-and-forget)
    emitEvent(AGENT_EVENTS.BOOKING_SURGE, 'booking_intake', 'info', {
      source: 'booking_intake_bot',
      messagePreview: message.slice(0, 200),
      historyLength: history.length,
    });

    return NextResponse.json({
      success: true,
      data: {
        reply,
        provider,
      },
    } as ApiResponse<unknown>);
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : 'Неизвестная ошибка';
    return NextResponse.json(
      { success: false, error: `Не удалось обработать запрос: ${msg}` } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
