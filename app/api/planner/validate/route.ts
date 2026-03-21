/**
 * POST /api/planner/validate
 *
 * AI-валидация логической последовательности дней маршрута.
 * Проверяет: зонные переходы, реалистичность, транспортные цепочки.
 *
 * Вызывается из TripBuilder v2 после перетаскивания дней (DnD).
 * Лёгкий вызов — 1-2 предложения от AI.
 *
 * Открытый маршрут — не требует авторизации.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { callAIWaterfall } from '@/lib/ai/providers';

export const dynamic = 'force-dynamic';

const DaySchema = z.object({
  day:             z.number(),
  zone:            z.enum(['avachinsky', 'western', 'eastern', 'northern']),
  title:           z.string(),
  activityType:    z.string(),
  defaultTransport: z.string(),
});

const BodySchema = z.object({
  days: z.array(DaySchema).min(2).max(21),
});

const ZONE_NAMES: Record<string, string> = {
  avachinsky: 'Авачинская (вулканы, PKC)',
  western:    'Западная (рыбалка)',
  eastern:    'Восточная (медведи)',
  northern:   'Северная (гейзеры)',
};

function buildValidationPrompt(days: z.infer<typeof DaySchema>[]): string {
  const plan = days
    .map((d, i) => `День ${i + 1}: ${d.title} [${ZONE_NAMES[d.zone] ?? d.zone}] (${d.activityType}, ${d.defaultTransport})`)
    .join('\n');

  return `Ты эксперт по туризму на Камчатке. Проанализируй последовательность дней маршрута.
Если есть явная логическая проблема (например, резкий переход между дальними зонами без буферного дня, или северная зона в день прилёта), объясни в 1 предложении. Если всё нормально — напиши "Маршрут логичен." Без эмодзи. Максимум 2 предложения.

Маршрут:
${plan}`;
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: 'Некорректный JSON' }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Некорректные данные', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const { days } = parsed.data;

  // Быстрая эвристическая проверка перед вызовом AI
  const issues: string[] = [];
  const FAR_ZONES = new Set(['northern', 'eastern']);
  const NEAR_ZONE = 'avachinsky';

  if (days.length >= 2) {
    const first = days[0];
    if (FAR_ZONES.has(first.zone)) {
      issues.push(`День 1 — ${ZONE_NAMES[first.zone]}: рекомендуем начать с Авачинской зоны (ближе к аэропорту).`);
    }
  }

  for (let i = 0; i < days.length - 1; i++) {
    const a = days[i];
    const b = days[i + 1];
    if (
      FAR_ZONES.has(a.zone) && FAR_ZONES.has(b.zone) &&
      a.zone !== b.zone &&
      !days.slice(i + 1).some(d => d.zone === NEAR_ZONE)
    ) {
      issues.push(`Переход ${ZONE_NAMES[a.zone]} → ${ZONE_NAMES[b.zone]}: добавьте буферный день в Авачинской зоне.`);
    }
  }

  // Если есть явные эвристические проблемы — не тратим AI-токены
  if (issues.length > 0) {
    return NextResponse.json({
      success: true,
      valid:   false,
      message: issues[0],
      issues,
    });
  }

  // AI-валидация для более тонких случаев
  const prompt = buildValidationPrompt(days);
  let message = 'Маршрут логичен.';

  try {
    const aiResult = await callAIWaterfall([{ role: 'user', content: prompt }]);
    if (aiResult) message = aiResult.trim();
  } catch {
    // Silently fall back to heuristic result
  }

  const valid = message.toLowerCase().includes('логичен')
    || message.toLowerCase().includes('нет проблем')
    || message.toLowerCase().includes('всё в порядке');

  return NextResponse.json({ success: true, valid, message, issues: [] });
}
