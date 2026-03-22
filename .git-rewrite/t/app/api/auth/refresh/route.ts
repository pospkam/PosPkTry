import { NextRequest, NextResponse } from 'next/server';
import { verifyAuth } from '@/lib/auth';
import { createToken } from '@/lib/auth/jwt';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const refreshLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

/**
 * POST /api/auth/refresh
 * Refreshes an existing valid JWT token.
 * The caller must send a valid (not yet expired) token.
 * Returns a new token with a fresh 7-day expiration.
 */
export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  if (!refreshLimiter.check(ip)) {
    return NextResponse.json(
      { success: false, error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429 }
    );
  }

  try {
    const auth = await verifyAuth(request);
    if (!auth.isAuthenticated || !auth.userId || !auth.email || !auth.role) {
      return NextResponse.json(
        { success: false, error: 'Токен недействителен' },
        { status: 401 }
      );
    }

    const newToken = await createToken({
      userId: auth.userId,
      email: auth.email,
      role: auth.role,
    });

    const response = NextResponse.json({
      success: true,
      token: newToken,
    });

    response.cookies.set('auth_token', newToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;
  } catch {
    return NextResponse.json(
      { success: false, error: 'Ошибка обновления токена' },
      { status: 500 }
    );
  }
}
