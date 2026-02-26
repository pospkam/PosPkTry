import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { ApiResponse } from '@/types';
import { requireOperator } from '@/lib/auth/middleware';
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

interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface ProviderConfig {
  name: string;
  envKey: string;
  baseUrl: string;
  model: string;
}

// Цепочка провайдеров: MiniMax -> DeepSeek -> x.ai
const PROVIDERS: ProviderConfig[] = [
  {
    name: 'MiniMax',
    envKey: 'MINIMAX_API_KEY',
    baseUrl: 'https://api.minimax.chat/v1',
    model: 'abab6.5s-chat',
  },
  {
    name: 'DeepSeek',
    envKey: 'DEEPSEEK_API_KEY',
    baseUrl: 'https://api.deepseek.com/v1',
    model: 'deepseek-chat',
  },
  {
    name: 'x.ai',
    envKey: 'XAI_API_KEY',
    baseUrl: 'https://api.x.ai/v1',
    model: 'grok-2-latest',
  },
];

// Типизированный ответ от провайдера
function isValidResponse(data: unknown): data is { choices: Array<{ message: { content: string } }> } {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  if (!Array.isArray(obj.choices) || obj.choices.length === 0) return false;
  const choice = obj.choices[0] as Record<string, unknown>;
  if (!choice.message || typeof choice.message !== 'object') return false;
  const msg = choice.message as Record<string, unknown>;
  return typeof msg.content === 'string';
}

/**
 * Пробуем каждого провайдера по порядку.
 * Пропускаем, если env не задан или запрос упал.
 */
async function callAIProviders(messages: ChatMessage[]): Promise<{ content: string; provider: string } | null> {
  for (const provider of PROVIDERS) {
    const apiKey = process.env[provider.envKey];
    if (!apiKey) continue;

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 20000);

      const response = await fetch(`${provider.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: provider.model,
          messages,
          temperature: 0.7,
          max_tokens: 1000,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (!response.ok) continue;

      const data: unknown = await response.json();
      if (isValidResponse(data)) {
        return { content: data.choices[0].message.content, provider: provider.name };
      }
    } catch {
      // Провайдер недоступен, пробуем следующего
      continue;
    }
  }

  return null;
}

/**
 * POST /api/ai/booking-intake
 * AI-агент приёма заявок на туры.
 * Доступен только операторам для тестирования.
 * Fallback: MiniMax -> DeepSeek -> x.ai -> текстовый ответ.
 */
export async function POST(request: NextRequest) {
  try {
    const userOrResponse = await requireOperator(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;

    const payload: unknown = await request.json();
    const validation = intakeSchema.safeParse(payload);

    if (!validation.success) {
      return NextResponse.json(
        { success: false, error: validation.error.issues } as ApiResponse<null>,
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

    const result = await callAIProviders(messages);

    if (result) {
      return NextResponse.json({
        success: true,
        data: {
          reply: result.content,
          provider: result.provider,
        },
      } as ApiResponse<unknown>);
    }

    // Fallback: если все провайдеры недоступны
    return NextResponse.json({
      success: true,
      data: {
        reply: 'Спасибо за обращение! Наш оператор свяжется с вами в ближайшее время. Для срочных вопросов: +7 914-782-22-22. При опасности звоните 112 (МЧС).',
        provider: 'fallback',
      },
    } as ApiResponse<unknown>);
  } catch (error) {
    console.error('[AI_BOOKING_INTAKE]', error);
    return NextResponse.json(
      { success: false, error: 'Не удалось обработать запрос' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
