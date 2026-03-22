/**
 * POST /api/planner/validate
 *
 * Минимальная валидация дней маршрута.
 * Требование: маршрут должен содержать хотя бы одну активность.
 *
 * Упрощённые правила: все остальные комбинации зон/дней разрешены.
 * Открытый маршрут — не требует авторизации.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const DaySchema = z.object({
  day:             z.number(),
  zone:            z.enum(['elizovsky', 'milkovsky', 'karaginsky', 'tigil']),
  title:           z.string(),
  activityType:    z.string(),
  defaultTransport: z.string(),
});

const BodySchema = z.object({
  days: z.array(DaySchema).min(2).max(21),
});

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

  // Упрощённая валидация: почти всё одобряем
  // Единственное требование: должна быть хотя бы одна активность
  const hasActivities = days.some(d => d.activityType && d.activityType !== 'rest');

  if (!hasActivities) {
    return NextResponse.json({
      success: true,
      valid: false,
      message: 'Добавьте хотя бы одну активность на маршрут.',
      issues: [],
    });
  }

  // Все остальные маршруты одобрены
  return NextResponse.json({
    success: true,
    valid: true,
    message: 'Маршрут готов. Выбирайте туры на каждый день.',
    issues: [],
  });
}
