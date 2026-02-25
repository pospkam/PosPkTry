import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { verifyPassword } from '@/lib/auth/password';
import { createToken } from '@/lib/auth/jwt';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/signin
 * User authentication endpoint
 */
// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    // Validation
    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Email и пароль обязательны'
      } as ApiResponse<null>, { status: 400 });
    }

    // Find user by email
    const userResult = await query(
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

    await query(
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
    } as ApiResponse<any>);

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
    console.error('Sign in error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при входе в систему',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}
