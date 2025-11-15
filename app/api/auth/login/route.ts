import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import bcrypt from 'bcryptjs';
import { generateToken } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';

/**
 * POST /api/auth/login
 * Вход в систему
 */
export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Валидация
    if (!email || !password) {
      return NextResponse.json({
        success: false,
        error: 'Email и пароль обязательны'
      }, { status: 400 });
    }

    // Поиск пользователя
    const userResult = await query(`
      SELECT 
        u.id,
        u.email,
        u.password_hash,
        u.name,
        u.phone,
        u.role,
        u.is_active,
        u.created_at
      FROM users u
      WHERE u.email = $1
    `, [email.toLowerCase()]);

    if (userResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Неверный email или пароль'
      }, { status: 401 });
    }

    const user = userResult.rows[0];

    // Проверка пароля
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json({
        success: false,
        error: 'Неверный email или пароль'
      }, { status: 401 });
    }

    // Проверка активности аккаунта
    if (!user.is_active) {
      return NextResponse.json({
        success: false,
        error: 'Ваш аккаунт не активен. Свяжитесь с администратором.'
      }, { status: 403 });
    }

    // Для операторов проверяем статус верификации
    if (user.role === 'operator') {
      const operatorResult = await query(`
        SELECT verification_status
        FROM operators
        WHERE user_id = $1
      `, [user.id]);

      if (operatorResult.rows.length > 0) {
        const operator = operatorResult.rows[0];
        
        if (operator.verification_status === 'rejected') {
          return NextResponse.json({
            success: false,
            error: 'Ваша заявка отклонена. Свяжитесь с поддержкой.'
          }, { status: 403 });
        }
        
        if (operator.verification_status === 'pending') {
          return NextResponse.json({
            success: false,
            error: 'Ваша заявка на рассмотрении. Ожидайте подтверждения.'
          }, { status: 403 });
        }
      }
    }

    // Генерируем JWT токен
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role
    });

    // Обновляем время последнего входа
    await query(`
      UPDATE users
      SET last_login_at = NOW()
      WHERE id = $1
    `, [user.id]);

    // Возвращаем данные
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
      message: 'Вход выполнен успешно'
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при входе. Попробуйте позже.'
    }, { status: 500 });
  }
}
