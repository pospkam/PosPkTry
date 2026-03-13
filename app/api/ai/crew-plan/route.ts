/**
 * POST /api/ai/crew-plan
 * 5-агентный AI-пайплайн для планирования туров по Камчатке
 *
 * Публичный эндпоинт — доступен без авторизации.
 * Вызывается из AIChatWidget при обнаружении tour-planning запроса.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { runCrewPipeline } from '@/lib/ai/crew-agents';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const crewPlanLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

const Schema = z.object({
  query: z
    .string({ required_error: 'Запрос обязателен' })
    .min(3, 'Минимум 3 символа')
    .max(500, 'Максимум 500 символов'),
  groupSize:    z.number().int().min(1).max(50).optional().default(1),
  budget:       z.number().min(0).optional(),
  durationDays: z.number().int().min(1).max(30).optional().default(3),
  difficulty:   z.enum(['Лёгкий', 'Средний', 'Сложный', 'Очень сложный']).optional(),
});

// AUTH: Public — открытый доступ для туристов
export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  if (!crewPlanLimiter.check(ip)) {
    return NextResponse.json(
      { success: false, error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429 }
    );
  }

  try {
    const body: unknown = await request.json();
    const parsed = Schema.safeParse(body);

    if (!parsed.success) {
      const firstError = parsed.error.errors[0];
      return NextResponse.json(
        { success: false, error: firstError?.message ?? 'Неверный формат запроса' },
        { status: 400 }
      );
    }

    const result = await runCrewPipeline(parsed.data);

    return NextResponse.json({
      success: true,
      data: {
        formatted:       result.formatted,
        intent:          result.intent,
        matches:         result.matches,
        plan:            result.plan,
        validation:      result.validation,
        processingSteps: result.processingSteps,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}
