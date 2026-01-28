import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/pillars/core-infrastructure-infrastructure/lib/database';
import { randomBytes, createHash } from 'crypto';

export const dynamic = 'force-dynamic';

function hashPassword(password: string, salt: string): string {
  return createHash('sha256').update(`${salt}:${password}`).digest('hex');
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { success: false, error: 'Неверный формат JSON' },
        { status: 400 }
      );
    }

    const { email, password, name } = body as Record<string, string>;

    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: 'Email, пароль и имя обязательны' },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Неверный формат email' },
        { status: 400 }
      );
    }

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Пароль должен содержать минимум 6 символов' },
        { status: 400 }
      );
    }

    const existingUser = await query<{ id: string }>(
      `SELECT id FROM users WHERE email = $1`,
      [email.toLowerCase()]
    );

    if (existingUser.rowCount && existingUser.rowCount > 0) {
      return NextResponse.json(
        { success: false, error: 'Пользователь с таким email уже существует' },
        { status: 400 }
      );
    }

    const salt = randomBytes(16).toString('hex');
    const passwordHash = hashPassword(password, salt);

    const result = await query<{
      id: string;
      email: string;
      name: string;
      role: string;
      created_at: string;
      updated_at: string;
    }>(
      `
        INSERT INTO users (email, password_hash, name, role, created_at, updated_at)
        VALUES ($1, $2, $3, $4, NOW(), NOW())
        RETURNING id, email, name, role, created_at, updated_at
      `,
      [email.toLowerCase(), `${salt}:${passwordHash}`, name, 'tourist']
    );

    return NextResponse.json({
      success: true,
      data: {
        id: result.rows[0].id,
        email: result.rows[0].email,
        name: result.rows[0].name,
        role: result.rows[0].role,
        createdAt: result.rows[0].created_at,
        updatedAt: result.rows[0].updated_at,
      },
    });
  } catch (error) {
    console.error('Sign up error:', error);
    return NextResponse.json(
      { success: false, error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}