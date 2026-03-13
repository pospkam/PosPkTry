import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Rate limit: 1 SOS per 10 minutes per IP (in-memory, не блокируем при сбое Redis)
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 10 * 60 * 1000;

const SOSSchema = z.object({
  latitude: z.number().min(-90, 'Неверная широта').max(90, 'Неверная широта').optional(),
  longitude: z.number().min(-180, 'Неверная долгота').max(180, 'Неверная долгота').optional(),
  message: z.string().max(500, 'Максимальная длина сообщения: 500 символов').optional(),
  emergency_type: z.string().optional(),
  accuracy: z.number().optional(),
  sessionId: z.string().optional(),
});

function isRateLimited(key: string): boolean {
  const last = rateLimitMap.get(key);
  if (!last) return false;
  return Date.now() - last < RATE_LIMIT_MS;
}

function setRateLimit(key: string): void {
  rateLimitMap.set(key, Date.now());
  // Очищаем устаревшие записи (> 1 часа)
  for (const [k, ts] of rateLimitMap.entries()) {
    if (Date.now() - ts > 60 * 60 * 1000) rateLimitMap.delete(k);
  }
}

/**
 * POST /api/safety/sos
 * Логирование SOS-сигнала от туриста.
 * Публичный endpoint — доступен без авторизации.
 */
export async function POST(request: NextRequest) {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '127.0.0.1';
  const userAgent = request.headers.get('user-agent') ?? null;

  // Оптимистичное чтение auth (не блокируем при отсутствии токена)
  const auth = await verifyAuth(request).catch(() => ({
    isAuthenticated: false,
    userId: null,
    role: null,
    email: null,
  }));

  const userId = auth.isAuthenticated ? auth.userId : null;
  const rateLimitKey = userId ?? ip;

  if (isRateLimited(rateLimitKey)) {
    return NextResponse.json(
      { success: false, error: 'SOS уже отправлен. Повторите через 10 минут.' },
      { status: 429 }
    );
  }

  let rawBody: unknown;
  try {
    rawBody = await request.json();
  } catch {
    // Тело может быть пустым — это допустимо для SOS
    rawBody = {};
  }

  const validationResult = SOSSchema.safeParse(rawBody);
  if (!validationResult.success) {
    return NextResponse.json(
      { success: false, error: validationResult.error.errors[0]?.message || 'Ошибка валидации' },
      { status: 400 }
    );
  }

  const { latitude, longitude, accuracy, message, sessionId } = validationResult.data;

  // Логируем в БД (не блокируем ответ при ошибке БД)
  try {
    await query(
      `INSERT INTO sos_events (user_id, session_id, lat, lng, accuracy, ip_address, user_agent)
       VALUES ($1, $2, $3, $4, $5, $6::inet, $7)`,
      [userId, sessionId, latitude, longitude, accuracy, ip, userAgent]
    );
    setRateLimit(rateLimitKey);
  } catch {
    // Даже при ошибке БД — сохраняем rate limit и возвращаем success
    setRateLimit(rateLimitKey);
  }

  return NextResponse.json({
    success: true,
    message: 'SOS-сигнал получен. Звоните 112 (МЧС) для немедленной помощи.',
    emergency: {
      mchs: '112',
      ambulance: '103',
    },
  });
}
