import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { hashPassword, validatePassword } from '@/lib/auth/password';
import { createToken } from '@/lib/auth/jwt';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/signup
 * User registration endpoint
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, name, role = 'tourist' } = body;

    // Validation
    if (!email || !password || !name) {
      return NextResponse.json({
        success: false,
        error: 'Email, пароль и имя обязательны'
      } as ApiResponse<null>, { status: 400 });
    }

    // Validate password strength
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return NextResponse.json({
        success: false,
        error: 'Пароль не соответствует требованиям',
        message: passwordValidation.errors.join(', ')
      } as ApiResponse<null>, { status: 400 });
    }

    // Validate role
    const validRoles = ['tourist', 'operator', 'guide', 'transfer', 'agent', 'admin'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({
        success: false,
        error: 'Неверная роль пользователя'
      } as ApiResponse<null>, { status: 400 });
    }

    // Check if user already exists
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Пользователь с таким email уже существует'
      } as ApiResponse<null>, { status: 409 });
    }

    // Hash password
    const passwordHash = await hashPassword(password);

    // Create user
    const userResult = await query(
      `INSERT INTO users (email, name, password_hash, role, preferences)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, name, role, preferences, created_at, updated_at`,
      [
        email.toLowerCase(),
        name,
        passwordHash,
        role,
        JSON.stringify({
          language: 'ru',
          notifications: true,
          emergencyAlerts: true,
          locationSharing: false,
          theme: 'system'
        })
      ]
    );

    const user = userResult.rows[0];

    // Create JWT token
    const token = await createToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Store session
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    await query(
      `INSERT INTO user_sessions (user_id, token, expires_at)
       VALUES ($1, $2, $3)`,
      [user.id, token, expiresAt]
    );

    // Initialize user eco points
    await query(
      `INSERT INTO user_eco_points (user_id, total_points, level)
       VALUES ($1, 0, 1)
       ON CONFLICT (user_id) DO NOTHING`,
      [user.id]
    );

    // Prepare response
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      roles: [user.role],
      preferences: user.preferences || {},
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      token
    };

    const response = NextResponse.json({
      success: true,
      data: userData,
      message: 'Регистрация успешна'
    } as ApiResponse<any>);

    // Set HTTP-only cookie
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60,
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('Sign up error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при регистрации',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}
