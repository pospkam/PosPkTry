/**
 * POST /api/hub/operator/register
 * Register new operator
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const RegisterSchema = z.object({
  company_name: z.string().min(3).max(255),
  contact_name: z.string().min(2).max(255),
  email: z.string().email(),
  phone: z.string().min(10).max(20),
  telegram: z.string().max(255).optional()
});

export async function POST(req: NextRequest) {
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
    const result = await pool.query(
      `INSERT INTO partners (
        name, email, phone, contacts, is_public, created_at
      ) VALUES ($1, $2, $3, $4, true, NOW())
      RETURNING id`,
      [
        data.company_name,
        data.email,
        data.phone,
        JSON.stringify({
          contact_name: data.contact_name,
          telegram_chat_id: data.telegram || null
        })
      ]
    );

    const operatorId = result.rows[0]?.id;

    // Log signup
    await pool.query(
      `INSERT INTO operator_signups (partner_id, telegram_handle, acquisition_source)
       VALUES ($1, $2, 'direct_register')`,
      [operatorId, data.telegram || null]
    );

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

    console.error('[Operator Register]', err);
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
