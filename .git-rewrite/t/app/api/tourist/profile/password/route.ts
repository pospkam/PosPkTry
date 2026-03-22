import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/middleware';
import { verifyPassword, hashPassword } from '@/lib/auth/password';
import { query } from '@/lib/database';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

const ChangePasswordSchema = z.object({
  currentPassword: z.string({ required_error: 'Текущий пароль обязателен' }).min(1, 'Текущий пароль не может быть пустым'),
  newPassword: z.string({ required_error: 'Новый пароль обязателен' }).min(8, 'Новый пароль должен содержать не менее 8 символов'),
});

const passwordLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/tourist/profile/password
 * Change password for the authenticated user.
 * Body: { currentPassword: string; newPassword: string }
 */
export async function PATCH(request: NextRequest) {
  const ip = getClientIp(request.headers);
  if (!passwordLimiter.check(ip)) {
    return NextResponse.json(
      { success: false, error: 'Слишком много попыток смены пароля. Попробуйте позже.' },
      { status: 429 }
    );
  }

  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const user = authResult;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Некорректный формат запроса' },
      { status: 400 }
    );
  }

  const parsed = ChangePasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' },
      { status: 400 }
    );
  }
  const { currentPassword, newPassword } = parsed.data;

  try {
    // Fetch current password hash
    const result = await query<{ password_hash: string }>(
      `SELECT password_hash FROM users WHERE id = $1`,
      [user.userId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Пользователь не найден' },
        { status: 404 }
      );
    }

    const { password_hash } = result.rows[0];

    // Verify current password
    const isValid = await verifyPassword(currentPassword, password_hash);
    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Текущий пароль указан неверно' },
        { status: 400 }
      );
    }

    // Hash and save new password
    const newHash = await hashPassword(newPassword);
    await query(
      `UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2`,
      [newHash, user.userId]
    );

    return NextResponse.json({ success: true, message: 'Пароль успешно изменён' });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      {
        success: false,
        error: 'Ошибка при смене пароля',
        details: process.env.NODE_ENV === 'development' ? msg : undefined,
      },
      { status: 500 }
    );
  }
}
