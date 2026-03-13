import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { z } from 'zod';
import { pool } from '@/lib/database';
import { hashPassword } from '@/lib/auth/password';

const RegisterSchema = z.object({
  email: z.string({ required_error: 'Email обязателен' }).email('Неверный формат email'),
  password: z.string({ required_error: 'Пароль обязателен' }).min(6, 'Пароль должен быть минимум 6 символов'),
  name: z.string({ required_error: 'Имя обязательно' }).min(1, 'Имя не может быть пустым'),
  phone: z.string().optional(),
  company_name: z.string().optional(),
  inn: z.string().optional(),
});

const jwtSecret = process.env.JWT_SECRET;

if (!jwtSecret) {
  throw new Error('JWT_SECRET is required');
}

const JWT_SECRET = new TextEncoder().encode(jwtSecret);

// PUBLIC: Auth entry point — register endpoint intentionally public (no token required).
export async function POST(request: NextRequest) {
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
    const { email, password, name, phone, company_name, inn } = parsed.data;

    // Роль при публичной регистрации — только tourist
    // Остальные роли (operator, guide, admin и т.д.) назначаются через админку
    const userRole = 'tourist';
    
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
    const result = await client.query(
      `INSERT INTO users (email, password_hash, name, role, phone, company_name, inn, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
       RETURNING id, email, name, role, created_at`,
      [email.toLowerCase(), hashedPassword, name, userRole, phone || null, company_name || null, inn || null]
    );
    
    const user = result.rows[0];
    
    // Генерируем JWT токен
    const token = await new SignJWT({
      userId: user.id,
      email: user.email,
      role: user.role,
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
    const msg = error instanceof Error ? error.message : 'Неизвестная ошибка';
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка регистрации: ' + msg },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}

