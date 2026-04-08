import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/lib/db-pool';
import { verifyPassword } from '@/lib/auth/password';
import { createToken } from '@/lib/auth/jwt';
import { sanitizeError } from '@/lib/errors/sanitize';
import { ApiResponse } from '@/types';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { UsersRow } from '@/lib/types/db-rows';

const SigninSchema = z.object({
  email: z.string({ required_error: 'Email обязателен' }).email('Неверный формат email'),
  password: z.string({ required_error: 'Пароль обязателен' }).min(1, 'Пароль не может быть пустым'),
});

export const dynamic = 'force-dynamic';

// 5 attempts per minute per IP — brute force protection
const signinRateLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

/**
 * POST /api/auth/signin
 * User authentication endpoint
 */
// PUBLIC: Auth entry point — signin endpoint intentionally public (no token required).
export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  if (!signinRateLimiter.check(ip)) {
    return NextResponse.json({
      success: false,
      error: 'Слишком много попыток. Попробуйте через минуту.'
    } as ApiResponse<null>, { status: 429 });
  }

  try {
    const body = await request.json();

    const parsed = SigninSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Некорректные данные'
      } as ApiResponse<null>, { status: 400 });
    }
    const { email, password } = parsed.data;

    // Find user by email
    const userResult = await pool.query<UsersRow>(
      `SELECT id, email, name, role, password_hash, preferences, created_at, updated_at
       FROM users
       WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Неверный email или пароль'
      } as ApiResponse<null>, { status: 401 });
    }

    const user = userResult.rows[0];

    // Verify password
    const isValidPassword = await verifyPassword(password, user.password_hash);
    if (!isValidPassword) {
      return NextResponse.json({
        success: false,
        error: 'Неверный email или пароль'
      } as ApiResponse<null>, { status: 401 });
    }

    // Create JWT token
    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Store session in database
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // 7 days

    await pool.query(
      `INSERT INTO user_sessions (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, token, expiresAt]
    );

    // Prepare response
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      roles: [user.role], // Для совместимости с frontend
      preferences: user.preferences || {},
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      token
    };

    const response = NextResponse.json({
      success: true,
      data: userData
    } as ApiResponse<unknown>);

    // Set HTTP-only cookie with token
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/'
    });

    return response;

  } catch (error) {
    const safeError = sanitizeError(error);
    return NextResponse.json({
      success: false,
      error: 'Сервис авторизации временно недоступен. Повторите попытку через минуту.',
      details: safeError.message,
    } as ApiResponse<null>, { status: 500 });
  }
}
