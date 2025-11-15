import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/register
 * Регистрация нового пользователя (турист, туроператор, партнёр и т.д.)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      email, 
      password, 
      name, 
      phone,
      role = 'tourist', // tourist, operator, partner, agent, etc.
      // Для туроператора
      company_name,
      company_inn,
      company_address,
      website,
      description
    } = body;

    // Валидация обязательных полей
    if (!email || !password || !name) {
      return NextResponse.json({
        success: false,
        error: 'Email, пароль и имя обязательны'
      }, { status: 400 });
    }

    // Валидация email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({
        success: false,
        error: 'Неверный формат email'
      }, { status: 400 });
    }

    // Валидация пароля (минимум 6 символов)
    if (password.length < 6) {
      return NextResponse.json({
        success: false,
        error: 'Пароль должен содержать минимум 6 символов'
      }, { status: 400 });
    }

    // Проверка существования email
    const existingUser = await query(
      'SELECT id FROM users WHERE email = $1',
      [email.toLowerCase()]
    );

    if (existingUser.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Пользователь с таким email уже существует'
      }, { status: 409 });
    }

    // Хешируем пароль
    const hashedPassword = await bcrypt.hash(password, 10);

    // Создаём пользователя
    const userResult = await query(`
      INSERT INTO users (
        email,
        password_hash,
        name,
        phone,
        role,
        is_active,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, email, name, phone, role, created_at
    `, [
      email.toLowerCase(),
      hashedPassword,
      name,
      phone || null,
      role,
      role === 'tourist' // Туристы активны сразу, операторы требуют верификации
    ]);

    const user = userResult.rows[0];

    // Если регистрируется туроператор - создаём запись в таблице operators
    if (role === 'operator') {
      await query(`
        INSERT INTO operators (
          id,
          user_id,
          company_name,
          company_inn,
          company_address,
          website,
          description,
          verification_status,
          created_at,
          updated_at
        ) VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
      `, [
        user.id,
        company_name || name,
        company_inn || null,
        company_address || null,
        website || null,
        description || null,
        'pending' // Ожидает верификации
      ]);
    }

    // Генерируем JWT токен
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Возвращаем данные пользователя и токен
    return NextResponse.json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          name: user.name,
          phone: user.phone,
          role: user.role,
          createdAt: user.created_at
        },
        token
      },
      message: role === 'operator' 
        ? 'Регистрация успешна! Ваша заявка отправлена на модерацию.' 
        : 'Регистрация успешна!'
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при регистрации. Попробуйте позже.'
    }, { status: 500 });
  }
}
