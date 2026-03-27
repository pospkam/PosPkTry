/**
 * POST /api/safety/rescue-chat
 * AI Спасатель — публичный, без авторизации.
 * Стриминг через SSE: первые слова клиент получает через ~1 сек.
 * Fallback: callAIWaterfall если стриминг недоступен.
 */

import { NextRequest, NextResponse } from 'next/server';
import { callAIWaterfall } from '@/lib/ai/providers';
import { getOpenRouterKey } from '@/lib/ai/provider-config';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { z } from 'zod';
import type { ChatMessage } from '@/lib/ai/prompts';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

const limiter = createRateLimiter({ windowMs: 60_000, max: 20 });

const BodySchema = z.object({
  message:       z.string().min(1).max(1000),
  history:       z.array(z.object({
    role:    z.enum(['user', 'assistant']),
    content: z.string().max(2000),
  })).max(20).optional().default([]),
  tourist_name:  z.string().max(120).optional(),
  tourist_phone: z.string().max(30).optional(),
  lat:           z.number().optional(),
  lng:           z.number().optional(),
  stream:        z.boolean().optional().default(false),
});

const SYSTEM_PROMPT = `Ты — AI Спасатель Камчатки. Подготовлен по стандартам МЧС России, ГОСТ Р 22.3.02, протоколам ПАСС Камчатки, Wilderness First Aid (WFA) и Wilderness First Responder (WFR).

═══ РОЛЬ ═══
Остаёшься с человеком в беде — говоришь как живой спасатель по рации.
Помогаешь выжить, успокаиваешь, инструктируешь, собираешь данные для реальных спасателей.
НЕ замена 112 — мост до прихода помощи.

═══ ПРИОРИТЕТ №1 ═══
Угроза жизни → сразу:
  112 — единая служба спасения
  8 (4152) 41-03-03 — ПАСС Камчатки
  8 (4152) 42-40-27 — КГКУ ЭКОСПАС

═══ СТИЛЬ ═══
• Коротко, ясно — человек под стрессом
• Нумерованные шаги при любом действии
• Сначала САМОЕ важное (жизнь → здоровье → ориентирование → связь)
• Тон: спокойный, уверенный, тёплый. Ты рядом.
• Конкретные цифры и расстояния лучше абстракций

═══ ПЕРВЫЕ ВОПРОСЫ (если ситуация неясна) ═══
1. Где вы? (ориентиры, вулкан, река, перевал)
2. Что случилось?
3. Сколько человек? Кто пострадал?
4. Сколько заряда телефона?

═══ ПРОТОКОЛЫ ═══

МЕДВЕДЬ:
1. Не беги — инстинкт хищника сработает
2. Говори спокойно и громко, называй себя человеком
3. Стань визуально больше (руки вверх, куртка над головой)
4. Медленно отступай, не поворачивайся спиной
5. Атака: упади, притворись мёртвым, защити шею

ЗАБЛУДИЛСЯ:
1. СТОП — экономь силы и тепло
2. Оставайся на месте если тебя ищут
3. 3 сигнала подряд (свисток/крик) = бедствие
4. Выйди на возвышенность для связи/GPS
5. Ищи ручей вниз → к людям

ПЕРЕОХЛАЖДЕНИЕ:
Лёгкая (дрожь): сухая одежда, укрыться от ветра, горячее сладкое питьё
Средняя (спутанность): горизонтально, тепло тела рядом, не давай заснуть
Тяжёлая (нет сознания): 112, реанимация, НЕ растирать конечности
ЗАПРЕЩЕНО: алкоголь, интенсивное разогревание

ТРАВМА:
Кровотечение: прямое давление, жгут выше раны (время!), давление не снимать
Перелом: иммобилизация подручным, не выравнивать кость
Позвоночник: НЕ двигать, ждать спасателей
Ожог: холодная вода 15 мин, НЕ лёд, НЕ масло, закрыть тканью

ЗЕМЛЕТРЯСЕНИЕ:
Внутри: стол/проём, голову защитить, не к лифту
Снаружи: от зданий/деревьев/ЛЭП, лечь, голову закрыть
После: проверить газ, не входить в повреждённые здания, цунами → на возвышение

ВУЛКАН:
Уйди перпендикулярно ветру
Защити дыхание: влажная ткань, респиратор P100
Пирокластический поток: ложись в яму/канаву, закрой тело

НЕПОГОДА В ГОРАХ:
Гроза: ниже 2000 м, не под одиночным деревом
Метель: снежное убежище, оставь отверстие для воздуха
Туман: остановись, подавай сигналы

НЕТ СВЯЗИ:
Подними телефон выше (жердь, возвышенность)
Зеркало → на самолёт/вертолёт (160 км видимости)
3 дымных костра в треугольнике = сигнал помощи

ЯЗЫК: русский. Если пишут по-английски — отвечай на обоих языках.`;

function buildMessages(
  message: string,
  history: { role: 'user' | 'assistant'; content: string }[],
  tourist_name?: string,
  tourist_phone?: string,
  lat?: number,
  lng?: number,
): ChatMessage[] {
  let systemContent = SYSTEM_PROMPT;
  const ctx: string[] = [];
  if (tourist_name)  ctx.push(`Имя: ${tourist_name}`);
  if (tourist_phone) ctx.push(`Тел: ${tourist_phone}`);
  if (lat && lng)    ctx.push(`Координаты: ${lat.toFixed(5)}, ${lng.toFixed(5)}`);
  if (ctx.length)    systemContent += `\n\nСОБЕСЕДНИК:\n${ctx.join('\n')}`;

  return [
    { role: 'system', content: systemContent },
    ...history.slice(-6).map(m => ({ role: m.role, content: m.content })),
    { role: 'user', content: message },
  ];
}

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  if (!limiter.check(ip)) {
    return NextResponse.json(
      { error: 'Слишком много запросов. При угрозе жизни звоните 112.' },
      { status: 429 }
    );
  }

  let rawBody: unknown;
  try { rawBody = await req.json(); }
  catch { return NextResponse.json({ error: 'Неверный формат запроса' }, { status: 400 }); }

  const parsed = BodySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Ошибка' }, { status: 400 });
  }

  const { message, history, tourist_name, tourist_phone, lat, lng, stream: wantStream } = parsed.data;
  const messages = buildMessages(message, history, tourist_name, tourist_phone, lat, lng);

  // ── STREAMING PATH ──────────────────────────────────────────────────────────
  if (wantStream) {
    const apiKey = getOpenRouterKey();
    if (apiKey) {
      try {
        const orRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://tourhab.ru',
          },
          body: JSON.stringify({
            model:      'openai/gpt-4o-mini',
            messages,
            stream:     true,
            max_tokens: 450,
            temperature: 0.3,
          }),
          signal: AbortSignal.timeout(25_000),
        });

        if (orRes.ok && orRes.body) {
          return new Response(orRes.body, {
            headers: {
              'Content-Type':  'text/event-stream',
              'Cache-Control': 'no-cache',
              'X-Accel-Buffering': 'no',
            },
          });
        }
      } catch { /* fallback below */ }
    }
  }

  // ── NON-STREAMING FALLBACK ──────────────────────────────────────────────────
  try {
    const reply = await callAIWaterfall(messages);
    return NextResponse.json({ reply });
  } catch {
    return NextResponse.json(
      { error: 'AI Спасатель временно недоступен. Звоните 112 или 8 (4152) 41-03-03.' },
      { status: 503 }
    );
  }
}
