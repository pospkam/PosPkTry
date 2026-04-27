import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';
import { verifyAuth } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Rate limit: 1 SOS per 10 minutes per IP (in-memory, не блокируем при сбое Redis)
const rateLimitMap = new Map<string, number>();
const RATE_LIMIT_MS = 10 * 60 * 1000;

const SOSSchema = z.object({
  latitude:      z.number().min(-90).max(90).optional(),
  longitude:     z.number().min(-180).max(180).optional(),
  lat:           z.number().min(-90).max(90).optional(),
  lng:           z.number().min(-180).max(180).optional(),
  accuracy:      z.number().optional(),
  message:       z.string().max(500).optional(),
  emergency_type: z.string().optional(),
  sessionId:     z.string().optional(),
  tourist_name:  z.string().max(120).optional(),
  tourist_phone: z.string().max(30).optional(),
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

  const { latitude, longitude, lat, lng, accuracy, message, emergency_type, sessionId, tourist_name, tourist_phone } = validationResult.data;

  // Принимаем оба соглашения: latitude/longitude и lat/lng
  const finalLat = latitude ?? lat;
  const finalLng = longitude ?? lng;

  // Логируем в БД
  try {
    await query(
      `INSERT INTO sos_events
         (user_id, session_id, lat, lng, accuracy, ip_address, user_agent,
          message, emergency_type, tourist_name, tourist_phone)
       VALUES ($1,$2,$3,$4,$5,$6::inet,$7,$8,$9,$10,$11)`,
      [userId, sessionId, finalLat, finalLng, accuracy, ip, userAgent,
       message ?? null, emergency_type ?? null, tourist_name ?? null, tourist_phone ?? null]
    );
    setRateLimit(rateLimitKey);
  } catch {
    setRateLimit(rateLimitKey);
  }

  // Telegram-уведомление (fire-and-forget) — приоритет: ADMIN, фоллбэк на основной бот-чатид админа.
  // Если админ-токен не задан, шлём через основной бот.
  const botToken = process.env.TELEGRAM_ADMIN_BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_ADMIN_CHAT_ID || process.env.TELEGRAM_CHAT_ID;
  if (botToken && chatId) {
    const loc = finalLat && finalLng
      ? `${finalLat.toFixed(5)}, ${finalLng.toFixed(5)}`
      : 'нет координат';
    const mapsLink = finalLat && finalLng
      ? `https://www.google.com/maps?q=${finalLat},${finalLng}`
      : '';
    const text = [
      '<b>🆘 SOS! ЭКСТРЕННЫЙ СИГНАЛ</b>',
      '',
      tourist_name  ? `👤 Имя: ${tourist_name}`   : '👤 Имя: не указано',
      tourist_phone ? `📞 Тел: ${tourist_phone}`   : '📞 Тел: не указан',
      '',
      `📍 Координаты: ${loc}`,
      mapsLink ? `🗺 <a href="${mapsLink}">Открыть на карте</a>` : '',
      `⚠️ Тип: ${emergency_type ?? 'не указан'}`,
      message       ? `💬 Сообщение: ${message}`   : '',
      `🌐 IP: ${ip}`,
    ].filter(Boolean).join('\n');

    fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        disable_web_page_preview: false,
      }),
    }).catch(() => { /* fire-and-forget */ });
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
