import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { verifyPassword, hashPassword } from '@/lib/auth/password';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/tourist/profile/password
 * Change password for the authenticated user.
 * Body: { currentPassword: string; newPassword: string }
 */
export async function PATCH(request: NextRequest) {
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

  const currentPassword =
    typeof (body as Record<string, unknown>).currentPassword === 'string'
      ? ((body as Record<string, unknown>).currentPassword as string).trim()
      : '';
  const newPassword =
    typeof (body as Record<string, unknown>).newPassword === 'string'
      ? ((body as Record<string, unknown>).newPassword as string)
      : '';

  if (!currentPassword || !newPassword) {
    return NextResponse.json(
      { success: false, error: 'Укажите текущий и новый пароль' },
      { status: 400 }
    );
  }

  if (newPassword.length < 8) {
    return NextResponse.json(
      { success: false, error: 'Новый пароль должен содержать не менее 8 символов' },
      { status: 400 }
    );
  }

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
