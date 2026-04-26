import { NextRequest, NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import { z } from 'zod';
import { pool } from '@/lib/db-pool';
import { hashPassword } from '@/lib/auth/password';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { emailService } from '@/lib/notifications/email-service';

async function notifyAdminTelegram(companyName: string, contactName: string, phone: string, email: string, partnerId: string) {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!chatId || !token) return;
  const text = `Новая заявка оператора\n\nКомпания: ${companyName}\nКонтакт: ${contactName}\nТел: ${phone}\nEmail: ${email}\n\nhttps://tourhab.ru/hub/admin/operators`;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'HTML' }),
  }).catch(() => {});
  void partnerId;
}

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

function getJWTSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET is required');
  return new TextEncoder().encode(secret);
}

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
      `INSERT INTO partners (
         user_id, name, company_name, category, description, short_description,
         contact, contacts, is_public, is_verified,
         profile_status, applied_at,
         created_at, updated_at
       )
       VALUES ($1,$2,$2,$3,$4,$4,$5::jsonb,$5::jsonb,false,false,'pending',NOW(),NOW(),NOW())
       RETURNING id, slug`,
      [user.id, companyName, category, description || companyName, contact]
    );
    const partner = partnerResult.rows[0];

    // Audit trail
    await client.query(
      `INSERT INTO operator_applications
         (partner_id, user_id, company_name, contact_phone, contact_email, description)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [partner.id, user.id, companyName, phone, email, description || '']
    );

    await client.query('COMMIT');

    // JWT cookie
    const token = await new SignJWT({ userId: user.id, email: user.email, role: 'operator', roles: ['operator'] })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(getJWTSecret());

    // Уведомления админу (fire-and-forget)
    notifyAdminTelegram(companyName, contactName, phone, email, partner.id).catch(() => {});
    const adminEmail = process.env.SMTP_USER;
    if (adminEmail) {
      emailService.sendEmail({
        to: adminEmail,
        subject: `Новый оператор: ${companyName}`,
        html: `<p>Зарегистрировался новый оператор.</p>
               <p><b>Компания:</b> ${companyName}<br>
               <b>Категория:</b> ${category}<br>
               <b>Контакт:</b> ${contactName}, ${phone}<br>
               <b>Email:</b> ${email}</p>
               <p><a href="https://tourhab.ru/hub/admin/operators">Очередь заявок →</a></p>`,
      }).catch(() => {});
    }

    // Приветственное письмо оператору
    emailService.sendEmail({
      to: email,
      subject: `Добро пожаловать в KamchatourHub, ${companyName}!`,
      html: `
        <h2>Ваш кабинет оператора активирован</h2>
        <p>Здравствуйте, ${contactName}!</p>
        <p>Компания <b>${companyName}</b> успешно зарегистрирована на платформе KamchatourHub.</p>
        <h3>Следующие шаги:</h3>
        <ol>
          <li><a href="https://tourhab.ru/hub/operator">Войдите в личный кабинет</a></li>
          <li>Добавьте первый тур (кнопка «Создать тур»)</li>
          <li>Настройте расписание и доступность</li>
          <li>Туристы увидят ваши туры в каталоге</li>
        </ol>
        <p>Комиссия платформы: <b>15%</b> от стоимости тура. Выплаты — еженедельно по пятницам.</p>
        <p>Вопросы? Пишите: <a href="mailto:${adminEmail ?? 'info@tourhab.ru'}">${adminEmail ?? 'info@tourhab.ru'}</a></p>
        <hr>
        <p style="color:#888;font-size:12px">KamchatourHub — tourhab.ru</p>
      `,
    }).catch(() => {});

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
