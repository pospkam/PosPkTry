import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { extractToken } from '@/lib/auth/jwt';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/signout
 * User logout endpoint
 */
// Idempotent logout — can be called with or without existing token; always clears session/cookie.
export async function POST(request: NextRequest) {
  try {
    // Get token from cookie or header
    const cookieToken = request.cookies.get('auth_token')?.value;
    const headerToken = extractToken(request.headers.get('Authorization'));
    const token = cookieToken || headerToken;

    if (token) {
      // Delete session from database
      await query(
        'DELETE FROM user_sessions WHERE token = $1',
        [token]
      );
    }

    // Prepare response
    const response = NextResponse.json({
      success: true,
      message: 'Выход выполнен успешно'
    } as ApiResponse<null>);

    // Clear cookie
    response.cookies.delete('auth_token');

    return response;

  } catch (error) {
    console.error('Sign out error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при выходе из системы'
    } as ApiResponse<null>, { status: 500 });
  }
}
