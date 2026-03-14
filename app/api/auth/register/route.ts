import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { z } from 'zod';
import { pool } from '@/lib/database';
import { hashPassword } from '@/lib/auth/password';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

const VALID_ROLES = ['tourist', 'operator', 'guide', 'transfer', 'agent', 'stay', 'gear'] as const;

const RegisterSchema = z.object({
  email: z.string({ required_error: 'Email обязателен' }).email('Неверный формат email'),
  password: z.string({ required_error: 'Пароль обязателен' }).min(6, 'Пароль должен быть минимум 6 символов'),
  name: z.string({ required_error: 'Имя обязательно' }).min(1, 'Имя не может быть пустым'),
  role: z.enum(VALID_ROLES).optional(),
  roles: z.array(z.enum(VALID_ROLES)).optional(),
});

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error('JWT_SECRET is required');
}

const JWT_SECRET = new TextEncoder().encode(jwtSecret);

const registerLimiter = createRateLimiter({ windowMs: 60_000, max: 3 });

// PUBLIC: Auth entry point — register endpoint intentionally public (no token required).
export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  if (!registerLimiter.check(ip)) {
    return NextResponse.json(
      { success: false, error: 'Слишком много попыток регистрации. Попробуйте позже.' },
      { status: 429 }
    );
  }

  let client;
  
  try {
    const body = await request.json();

    const parsed = RegisterSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      );
    }
    const { email, password, name, role, roles } = parsed.data;

    // Определяем роль: переданная роль > первая из массива ролей > tourist
    const userRole = role ?? roles?.[0] ?? 'tourist';
    // Все роли для сохранения в preferences (для мультиролей)
    const allRoles = roles?.length ? roles : [userRole];

    // Подключаемся к БД
    client = await pool.connect();

    // Проверяем существование пользователя
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Пользователь с таким email уже существует' },
        { status: 409 }
      );
    }

    // Хешируем пароль единым методом
    const hashedPassword = await hashPassword(password);

    // Создаем пользователя
    const preferences = { roles: allRoles };
    const result = await client.query(
      `INSERT INTO users (email, password_hash, name, role, preferences, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, NOW(), NOW())
       RETURNING id, email, name, role, preferences, created_at`,
      [email.toLowerCase(), hashedPassword, name, userRole, JSON.stringify(preferences)]
    );
    
    const user = result.rows[0];
    
    // Генерируем JWT токен
    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
      roles: allRoles,
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);
    
    // Возвращаем ответ с токеном
    const response = NextResponse.json(
      {
        success: true,
        message: 'Регистрация успешна',
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          roles: allRoles,
        },
        token,
      },
      { status: 201 }
    );
    
    // Устанавливаем cookie с токеном
    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 дней
      path: '/',
    });
    
    return response;
    
  } catch (error: unknown) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка регистрации. Попробуйте позже.' },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}

