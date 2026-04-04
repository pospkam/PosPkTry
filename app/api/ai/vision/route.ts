/**
 * POST /api/ai/vision
 *
 * Анализ изображений через Gemini Vision.
 * Турист загружает фото → AI определяет что на нём (вулкан, животное, локация)
 * и предлагает релевантные туры.
 *
 * Body: { image: string (base64), mimeType?: string, question?: string }
 * Max image size: 4MB (base64)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { safeMsg } from '@/lib/errors/sanitize';
import { callGeminiVision } from '@/lib/ai/providers';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const limiter = createRateLimiter({ windowMs: 60_000, max: 10 });

const bodySchema = z.object({
  image: z.string().min(100).max(6_000_000), // base64, ~4MB raw
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/webp', 'image/gif']).default('image/jpeg'),
  question: z.string().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  const allowed = limiter.check(ip);
  if (!allowed) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Подождите минуту.' },
      { status: 429 },
    );
  }

  try {
    const raw = await req.json();
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Некорректные данные', details: parsed.error.issues },
        { status: 400 },
      );
    }

    const { image, mimeType, question } = parsed.data;

    const prompt = question
      ? `${question}\n\nЕсли на фото видна природа Камчатки — определи локацию, вулкан, животное или растение. Предложи подходящий тур.`
      : 'Что изображено на этом фото? Если это природа Камчатки — определи локацию, вулкан, животное или растение. Предложи туристу подходящий тур на tourhab.ru.';

    const result = await callGeminiVision(image, mimeType, prompt);

    if (!result) {
      return NextResponse.json(
        { error: 'Не удалось проанализировать изображение. Попробуйте другое фото.' },
        { status: 502 },
      );
    }

    return NextResponse.json({ analysis: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Неизвестная ошибка';
    return NextResponse.json(
      { error: safeMsg('Ошибка анализа изображения', message) },
      { status: 500 },
    );
  }
}
