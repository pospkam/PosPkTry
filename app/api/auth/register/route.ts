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
  pd_consent: z.literal(true, { errorMap: () => ({ message: 'Необходимо согласие на обработку персональных данных' }) }),
  referralCode: z.string().max(20).optional(),
});

function getJWTSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required');
  return new TextEncoder().encode(secret);
}

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
    const { email, password, name, role, roles, referralCode } = parsed.data;

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
      `INSERT INTO users (email, password_hash, name, role, preferences, pd_consent_at, pd_consent_ip, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5::jsonb, NOW(), $6, NOW(), NOW())
       RETURNING id, email, name, role, preferences, created_at`,
      [email.toLowerCase(), hashedPassword, name, userRole, JSON.stringify(preferences), ip]
    );
    
    const user = result.rows[0];

    // Если роль — оператор, сразу создаём запись в partners
    if (userRole === 'operator') {
      const slug = name.toLowerCase()
        .replace(/[^a-zа-я0-9]/gi, '-')
        .replace(/-+/g, '-')
        .slice(0, 40) + '-' + (user.id as string).slice(0, 8);
      await client.query(
        `INSERT INTO partners
           (user_id, name, category, contact, commission_rate,
            profile_status, onboarding_completed, is_public, slug, created_at, updated_at)
         VALUES ($1, $2, 'operator', '{}'::jsonb, 0.15, 'none', false, false, $3, NOW(), NOW())
         ON CONFLICT DO NOTHING`,
        [user.id, name, slug]
      );
    }

    // Handle referral code
    if (referralCode) {
      const referrerResult = await client.query(
        'SELECT id FROM users WHERE referral_code = $1',
        [referralCode.toUpperCase()]
      );
      if (referrerResult.rows[0]) {
        const referrerId = referrerResult.rows[0].id as string;
        await client.query(
          'UPDATE users SET referred_by = $1 WHERE id = $2',
          [referrerId, user.id]
        );
        await client.query(
          `INSERT INTO referrals (referrer_id, referred_id, referral_code, status)
           VALUES ($1, $2, $3, 'pending')
           ON CONFLICT (referrer_id, referred_id) DO NOTHING`,
          [referrerId, user.id, referralCode.toUpperCase()]
        );
      }
    }
    
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
      .sign(getJWTSecret());
    
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

