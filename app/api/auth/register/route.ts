import { NextRequest, NextResponse } from 'next/server';
import { hash } from 'bcryptjs';
import { SignJWT } from 'jose';
import { pool } from '@/lib/db';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'kamchatour-hub-secret-key-change-in-production'
);

export async function POST(request: NextRequest) {
  let client;
  
  try {
    const body = await request.json();
    const { email, password, name, role, phone, company_name, inn } = body;
    
    // Валидация обязательных полей
    if (!email || !password || !name) {
      return NextResponse.json(
        { success: false, error: 'Email, пароль и имя обязательны' },
        { status: 400 }
      );
    }
    
    // Валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: 'Неверный формат email' },
        { status: 400 }
      );
    }
    
    // Валидация пароля
    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'Пароль должен быть минимум 6 символов' },
        { status: 400 }
      );
    }
    
    // Валидация роли
    const validRoles = ['tourist', 'operator', 'guide', 'agent', 'transfer', 'admin'];
    const userRole = role || 'tourist';
    if (!validRoles.includes(userRole)) {
      return NextResponse.json(
        { success: false, error: 'Неверная роль' },
        { status: 400 }
      );
    }
    
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
    
    // Хешируем пароль
    const hashedPassword = await hash(password, 12);
    
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
    
  } catch (error: any) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка регистрации: ' + (error.message || 'Неизвестная ошибка') },
      { status: 500 }
    );
  } finally {
    if (client) {
      client.release();
    }
  }
}

