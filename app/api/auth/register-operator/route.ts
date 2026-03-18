import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { z } from 'zod';
import { pool } from '@/lib/db-pool';
import { hashPassword } from '@/lib/auth/password';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { emailService } from '@/lib/notifications/email-service';

const CATEGORIES = ['operator', 'guide', 'transfer', 'hotel', 'rent', 'fishing'] as const;

const Schema = z.object({
  companyName:  z.string().min(2, 'Название компании обязательно'),
  category:     z.enum(CATEGORIES),
  description:  z.string().max(500).optional().default(''),
  contactName:  z.string().min(2, 'Имя контактного лица обязательно'),
  phone:        z.string().min(10, 'Укажите телефон'),
  email:        z.string().email('Неверный формат email'),
  password:     z.string().min(8, 'Пароль — минимум 8 символов'),
  pd_consent:   z.literal(true, { errorMap: () => ({ message: 'Необходимо согласие на обработку ПД' }) }),
});

const jwtSecret = process.env.JWT_SECRET;
if (!jwtSecret) throw new Error('JWT_SECRET is required');
const JWT_SECRET = new TextEncoder().encode(jwtSecret);

const limiter = createRateLimiter({ windowMs: 60_000, max: 3 });

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  if (!limiter.check(ip)) {
    return NextResponse.json(
      { success: false, error: 'Слишком много попыток. Попробуйте позже.' },
      { status: 429 }
    );
  }

  let client;
  try {
    const body = await request.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      );
    }

    const { companyName, category, description, contactName, phone, email, password } = parsed.data;

    client = await pool.connect();

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Пользователь с таким email уже существует' },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    await client.query('BEGIN');

    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, name, role, preferences, pd_consent_at, pd_consent_ip, created_at, updated_at)
       VALUES ($1, $2, $3, 'operator', '{"roles":["operator"]}'::jsonb, NOW(), $4, NOW(), NOW())
       RETURNING id, email, name, role`,
      [email.toLowerCase(), passwordHash, contactName, ip]
    );
    const user = userResult.rows[0];

    const contact = JSON.stringify({ name: contactName, phone, email });
    const partnerResult = await client.query(
      `INSERT INTO partners (user_id, name, category, description, short_description, contact, is_public, is_verified, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $4, $5::jsonb, false, false, NOW(), NOW())
       RETURNING id, slug`,
      [user.id, companyName, category, description || companyName, contact]
    );
    const partner = partnerResult.rows[0];

    await client.query('COMMIT');

    // JWT cookie
    const token = await new SignJWT({ userId: user.id, email: user.email, role: 'operator', roles: ['operator'] })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    // Уведомить админа (fire-and-forget)
    const adminEmail = process.env.SMTP_USER;
    if (adminEmail) {
      emailService.sendEmail({
        to: adminEmail,
        subject: `Новый оператор: ${companyName}`,
        html: `<p>Зарегистрировался новый оператор.</p>
               <p><b>Компания:</b> ${companyName}<br>
               <b>Категория:</b> ${category}<br>
               <b>Контакт:</b> ${contactName}, ${phone}<br>
               <b>Email:</b> ${email}<br>
               <b>Partner ID:</b> ${partner.id}</p>
               <p><a href="https://tourhab.ru/hub/admin/content/partners/${partner.id}">Открыть в админке →</a></p>`,
      }).catch(() => {});
    }

    const response = NextResponse.json({
      success: true,
      message: 'Регистрация успешна. Ваш кабинет активирован.',
      user: { id: user.id, email: user.email, name: user.name, role: 'operator' },
    }, { status: 201 });

    response.cookies.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    });

    return response;

  } catch {
    if (client) await client.query('ROLLBACK').catch(() => {});
    return NextResponse.json(
      { success: false, error: 'Ошибка регистрации. Попробуйте позже.' },
      { status: 500 }
    );
  } finally {
    client?.release();
  }
}
