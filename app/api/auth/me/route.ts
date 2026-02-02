import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { verifyToken, extractToken } from '@/lib/auth/jwt';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/me
 * Get current user info
 */
export async function GET(request: NextRequest) {
  try {
    // Get token from cookie or header
    const cookieToken = request.cookies.get('auth_token')?.value;
    const headerToken = extractToken(request.headers.get('Authorization'));
    const token = cookieToken || headerToken;

    if (!token) {
      return NextResponse.json({
        success: false,
        error: 'Не авторизован'
      } as ApiResponse<null>, { status: 401 });
    }

    // Verify token
    const payload = await verifyToken(token);
    if (!payload) {
      return NextResponse.json({
        success: false,
        error: 'Неверный или истекший токен'
      } as ApiResponse<null>, { status: 401 });
    }

    // Get user data
    const userResult = await query(
      `SELECT id, email, name, role, preferences, created_at, updated_at
       FROM users
       WHERE id = $1`,
      [payload.userId]
    );

    if (userResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Пользователь не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const user = userResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        roles: [user.role],
        preferences: user.preferences || {},
        createdAt: user.created_at,
        updatedAt: user.updated_at
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении данных пользователя'
    } as ApiResponse<null>, { status: 500 });
  }
}
