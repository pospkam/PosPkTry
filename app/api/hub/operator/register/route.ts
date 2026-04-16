/**
 * POST /api/hub/operator/register
 * Регистрация нового оператора:
 *   1. Создаёт запись в users (role='operator')
 *   2. Создаёт запись в partners и связывает через user_id
 *   3. Возвращает JWT токен — оператор сразу залогинен
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { z } from 'zod';
import { hashPassword } from '@/lib/auth/password';
import { createToken } from '@/lib/auth/jwt';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const registerLimiter = createRateLimiter({ windowMs: 60_000, max: 3 });

const RegisterSchema = z.object({
  company_name: z.string().min(3, 'Название минимум 3 символа').max(255),
  contact_name: z.string().min(2, 'Имя минимум 2 символа').max(255),
  email:        z.string().email('Неверный формат email'),
  phone:        z.string().min(10, 'Телефон слишком короткий').max(20),
  password:     z.string().min(8, 'Пароль минимум 8 символов').max(100),
  telegram:     z.string().max(255).optional(),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  if (!registerLimiter.check(ip)) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте через минуту.' },
      { status: 429 },
    );
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Невалидный JSON' }, { status: 400 });
  }

  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? 'Ошибка валидации' },
      { status: 400 },
    );
  }

  const data = parsed.data;

  // Проверяем дубликат email в users
  const existingUser = await pool.query(
    `SELECT id FROM users WHERE email = $1 LIMIT 1`,
    [data.email],
  );
  if (existingUser.rows.length > 0) {
    return NextResponse.json({ error: 'Email уже зарегистрирован' }, { status: 400 });
  }

  const passwordHash = await hashPassword(data.password);

  // Транзакция: users + partners + связь
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Создаём user
    const userResult = await client.query<{ id: string }>(
      `INSERT INTO users (name, email, password_hash, role, created_at, updated_at)
       VALUES ($1, $2, $3, 'operator', NOW(), NOW())
       RETURNING id`,
      [data.contact_name, data.email, passwordHash],
    );
    const userId = userResult.rows[0]!.id;

    // 2. Создаём partner
    const slug = data.company_name
      .toLowerCase()
      .replace(/[^a-zа-яё0-9]/gi, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 40) + '-' + Date.now().toString(36);

    const partnerResult = await client.query<{ id: string }>(
      `INSERT INTO partners (
         user_id, name, category, contact, contacts, is_public,
         commission_rate, profile_status, onboarding_completed, slug, created_at, updated_at
       ) VALUES ($1, $2, 'operator', $3::jsonb, $4::jsonb, false, 0.15, 'none', false, $5, NOW(), NOW())
       RETURNING id`,
      [
        userId,
        data.company_name,
        JSON.stringify({ phone: data.phone, email: data.email }),
        JSON.stringify({
          contact_name: data.contact_name,
          telegram: data.telegram ?? null,
          phone: data.phone,
          email: data.email,
        }),
        slug,
      ],
    );
    const partnerId = partnerResult.rows[0]!.id;

    // 3. Логируем (graceful)
    await client.query(
      `INSERT INTO operator_signups (partner_id, telegram_handle, acquisition_source)
       VALUES ($1, $2, 'direct_register')`,
      [partnerId, data.telegram ?? null],
    ).catch(() => null);

    await client.query('COMMIT');

    // 4. Создаём JWT — оператор сразу залогинен
    const token = await createToken({ userId, email: data.email, role: 'operator' });

    return NextResponse.json({
      success:     true,
      token,
      operator_id: partnerId,
      user_id:     userId,
      message:     'Регистрация успешна!',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    const msg = err instanceof Error ? err.message : String(err);
    // Дубликат email на уровне БД
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return NextResponse.json({ error: 'Email уже зарегистрирован' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Ошибка регистрации' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function GET() {
  return NextResponse.json({ message: 'POST to register new operator' });
}
