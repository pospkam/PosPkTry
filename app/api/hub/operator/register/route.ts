/**
 * POST /api/hub/operator/register
 * Register new operator
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { z } from 'zod';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const registerLimiter = createRateLimiter({ windowMs: 60_000, max: 3 }); // 3 per min per IP

const RegisterSchema = z.object({
  company_name: z.string().min(3).max(255),
  contact_name: z.string().min(2).max(255),
  email: z.string().email(),
  phone: z.string().min(10).max(20),
  telegram: z.string().max(255).optional()
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  if (!registerLimiter.check(ip)) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте через минуту.' },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const data = RegisterSchema.parse(body);

    // Check if email already exists
    const existing = await pool.query(
      `SELECT id FROM partners WHERE email = $1 LIMIT 1`,
      [data.email]
    );

    if (existing.rows.length > 0) {
      return NextResponse.json(
        { error: 'Email уже зарегистрирован' },
        { status: 400 }
      );
    }

    // Create operator record
    const slug = data.company_name.toLowerCase()
      .replace(/[^a-zа-я0-9]/gi, '-')
      .replace(/-+/g, '-')
      .slice(0, 40) + '-' + Date.now().toString(36);

    const result = await pool.query(
      `INSERT INTO partners (
        name, category, contact, contacts, is_public,
        commission_rate, profile_status, onboarding_completed, slug, created_at, updated_at
      ) VALUES ($1, 'operator', $2::jsonb, $3::jsonb, false, 0.15, 'none', false, $4, NOW(), NOW())
      RETURNING id`,
      [
        data.company_name,
        JSON.stringify({ phone: data.phone, email: data.email }),
        JSON.stringify({
          contact_name: data.contact_name,
          telegram: data.telegram || null,
          phone: data.phone,
          email: data.email,
        }),
        slug,
      ]
    );

    const operatorId = result.rows[0]?.id;

    // Log signup (graceful — таблица может отсутствовать в старых инстансах)
    await pool.query(
      `INSERT INTO operator_signups (partner_id, telegram_handle, acquisition_source)
       VALUES ($1, $2, 'direct_register')`,
      [operatorId, data.telegram || null]
    ).catch(() => null);

    return NextResponse.json({
      success: true,
      operator_id: operatorId,
      message: 'Регистрация успешна!'
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Неверные данные: ' + err.errors[0]?.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Ошибка регистрации' },
      { status: 500 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    message: 'POST to register new operator'
  });
}
