/**
 * GET /api/auth/magic?token=<jwt>
 *
 * Magic link вход — без пароля.
 * Токен генерируется ботом по команде /login (15 минут жизни).
 * После валидации ставит auth_token cookie и редиректит в ЛК.
 */

import { NextRequest, NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import { createToken } from '@/lib/auth/jwt';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

function getMagicSecret(): Uint8Array {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET not set');
  return new TextEncoder().encode('magic:' + s);
}

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) {
    return NextResponse.redirect(new URL('/auth/signin?error=no_token', req.url));
  }

  try {
    const { payload } = await jwtVerify(token, getMagicSecret());
    const userId = payload.userId as string;

    // Загружаем пользователя из БД
    const { rows } = await pool.query<{ id: string; email: string; name: string; role: string }>(
      'SELECT id, email, name, role FROM users WHERE id = $1',
      [userId]
    );

    if (!rows[0]) {
      return NextResponse.redirect(new URL('/auth/signin?error=not_found', req.url));
    }

    const user = rows[0];

    // Создаём полноценный auth_token (7 дней)
    const authToken = await createToken({
      userId: user.id,
      email:  user.email,
      role:   user.role,
    });

    // Редирект в зависимости от роли и email
    const redirect = user.role === 'admin'
      ? (user.email === 'artem@mchs-kamchatka.ru' ? '/hub/admin/artem' : '/hub/admin')
      : '/hub/tourist';

    const res = NextResponse.redirect(new URL(redirect, req.url));
    res.cookies.set('auth_token', authToken, {
      httpOnly: true,
      secure:   process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge:   60 * 60 * 24 * 7,
      path:     '/',
    });
    return res;

  } catch {
    return NextResponse.redirect(new URL('/auth/signin?error=expired', req.url));
  }
}
