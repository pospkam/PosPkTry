/**
 * POST /api/auth/telegram
 *
 * Telegram Login Widget callback.
 * Verifies the hash using HMAC-SHA256(data_check_string, SHA256(bot_token)),
 * then finds or creates a user, issues JWT + sets cookie.
 *
 * Env vars required:
 *   TELEGRAM_BOT_TOKEN          — login bot token (set in BotFather)
 *
 * Env vars for the widget (frontend):
 *   NEXT_PUBLIC_TELEGRAM_BOT_USERNAME — bot @username for the widget script
 */

import { NextRequest, NextResponse } from 'next/server';
import { createHmac, createHash, timingSafeEqual } from 'crypto';
import { z } from 'zod';
import { query } from '@/lib/database';
import { createToken } from '@/lib/auth/jwt';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { sendWelcomeMessage } from '@/lib/telegram/welcome';

export const dynamic = 'force-dynamic';

const TG_MAX_AGE_SECONDS = 86_400; // 24 часа

const tgRateLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

const TelegramAuthSchema = z.object({
  id:          z.number().int(),
  first_name:  z.string().min(1).max(64),
  last_name:   z.string().max(64).optional(),
  username:    z.string().max(64).optional(),
  photo_url:   z.string().url().max(500).optional(),
  auth_date:   z.number().int(),
  hash:        z.string().length(64),
});

type TelegramAuthData = z.infer<typeof TelegramAuthSchema>;

// ── Verify Telegram HMAC ──────────────────────────────────────────
function verifyTelegramHash(data: TelegramAuthData, botToken: string): boolean {
  const { hash, ...fields } = data;

  // data_check_string: sorted key=value pairs joined by \n
  const dataCheckString = Object.entries(fields)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}=${String(v)}`)
    .sort()
    .join('\n');

  // secret_key = SHA256(bot_token) — raw bytes (not HMAC)
  const secretKey = createHash('sha256').update(botToken).digest();

  // HMAC-SHA256(data_check_string, secret_key)
  const expectedHash = createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex');

  // Timing-safe compare
  try {
    return timingSafeEqual(
      Buffer.from(hash, 'hex'),
      Buffer.from(expectedHash, 'hex'),
    );
  } catch {
    return false;
  }
}

// ── Find or create user by telegram_id ───────────────────────────
interface TgUserRow {
  id:    string;
  email: string;
  name:  string;
  role:  string;
}

async function findOrCreateTelegramUser(tgData: TelegramAuthData): Promise<TgUserRow> {
  // Try to find existing
  const existing = await query<TgUserRow>(
    `SELECT id, email, name, role FROM users WHERE telegram_id = $1 LIMIT 1`,
    [tgData.id],
  );
  if (existing.rows[0]) return existing.rows[0];

  // Create new user
  const name = [tgData.first_name, tgData.last_name].filter(Boolean).join(' ');
  const email = `tg_${tgData.id}@telegram.local`;

  const created = await query<TgUserRow>(
    `INSERT INTO users (email, name, role, telegram_id, telegram_username, password_hash, is_active, pd_consent_given)
     VALUES ($1, $2, 'tourist', $3, $4, '', TRUE, TRUE)
     ON CONFLICT (telegram_id) DO UPDATE SET
       telegram_username = EXCLUDED.telegram_username,
       name = CASE WHEN users.name = '' THEN EXCLUDED.name ELSE users.name END
     RETURNING id, email, name, role`,
    [email, name, tgData.id, tgData.username ?? null],
  );
  return created.rows[0];
}

// ── POST handler ──────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  if (!tgRateLimiter.check(ip)) {
    return NextResponse.json({ success: false, error: 'Слишком много запросов.' }, { status: 429 });
  }

  const botToken = process.env.TELEGRAM_BOT_TOKEN;
  if (!botToken) {
    return NextResponse.json({ success: false, error: 'Telegram auth не настроен.' }, { status: 503 });
  }

  let body: unknown;
  try { body = await request.json(); }
  catch { return NextResponse.json({ success: false, error: 'Некорректный запрос.' }, { status: 400 }); }

  const parsed = TelegramAuthSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Некорректные данные Telegram.' },
      { status: 400 },
    );
  }
  const tgData = parsed.data;

  // auth_date freshness check
  const ageSeconds = Math.floor(Date.now() / 1000) - tgData.auth_date;
  if (ageSeconds > TG_MAX_AGE_SECONDS) {
    return NextResponse.json({ success: false, error: 'Сессия Telegram устарела. Войдите снова.' }, { status: 401 });
  }

  // Hash verification
  if (!verifyTelegramHash(tgData, botToken)) {
    return NextResponse.json({ success: false, error: 'Подпись Telegram недействительна.' }, { status: 401 });
  }

  // Проверяем: первый ли раз этот аккаунт входит через Telegram
  const existing = await query<{ id: string }>(
    `SELECT id FROM users WHERE telegram_id = $1 LIMIT 1`,
    [tgData.id],
  );
  const isFirstTgLink = existing.rows.length === 0;

  // Find or create
  const user = await findOrCreateTelegramUser(tgData);

  // Если пользователь — оператор/гид, сохраняем telegram_chat_id в partners
  // Это позволяет боту отправлять уведомления и авторизовать inline-кнопки автоматически
  if (user.role === 'operator' || user.role === 'guide') {
    await query(
      `UPDATE partners SET telegram_chat_id = $1 WHERE user_id = $2 AND telegram_chat_id IS DISTINCT FROM $1`,
      [tgData.id, user.id],
    ).catch(() => null);
  }

  // Персональное приветствие при первом подключении Telegram-канала
  if (isFirstTgLink) {
    const name = [tgData.first_name, tgData.last_name].filter(Boolean).join(' ') || 'Путешественник';
    void sendWelcomeMessage(user.id, {
      telegramId: tgData.id,
      name,
      role: user.role,
      isNewUser: true,
    });
  }

  // Issue JWT
  const token = await createToken({ userId: user.id, email: user.email, role: user.role });

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 7);
  await query(
    `INSERT INTO user_sessions (user_id, token, expires_at) VALUES ($1, $2, $3)`,
    [user.id, token, expiresAt],
  ).catch(() => null);

  const response = NextResponse.json({
    success: true,
    data: { id: user.id, email: user.email, name: user.name, role: user.role, token },
  });

  response.cookies.set('auth_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60,
    path: '/',
  });

  return response;
}
