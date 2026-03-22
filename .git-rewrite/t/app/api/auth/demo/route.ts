import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const demoLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

const DemoRoleSchema = z.object({
  role: z.enum(['tourist', 'operator', 'guide', 'admin', 'agent'], { errorMap: () => ({ message: 'Укажите корректную роль' }) }).optional(),
});

// PUBLIC: Demo-only endpoint — intentionally public for demo/trial flows (no token required).
export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  if (!demoLimiter.check(ip)) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = DemoRoleSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      );
    }

    const { role } = parsed.data;

    const demoUser = {
      id: 'demo_user_123',
      email: 'pospk@mail.ru',
      name: 'Демо Пользователь',
      avatar: '/api/placeholder/64/64',
      roles: [role || 'tourist'],
      preferences: {
        language: 'ru',
        notifications: true,
        emergencyAlerts: true,
        locationSharing: false,
        theme: 'system'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDemo: true
    };

    return NextResponse.json(demoUser);
  } catch (error) {
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}