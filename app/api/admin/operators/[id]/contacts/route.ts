/**
 * PATCH /api/admin/operators/[id]/contacts
 * Обновляет поля в contacts JSONB оператора (telegram_chat_id и др.)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const Schema = z.object({
  telegram_chat_id: z.string().max(50).nullable().optional(),
  phone:            z.string().max(30).optional(),
  email:            z.string().email().optional().nullable(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const body: unknown = await request.json().catch(() => null);
  if (!body) return NextResponse.json({ error: 'Неверный JSON' }, { status: 400 });

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message }, { status: 400 });
  }

  // Собираем только переданные поля
  const updates: Record<string, string | null> = {};
  if (parsed.data.telegram_chat_id !== undefined) updates.telegram_chat_id = parsed.data.telegram_chat_id;
  if (parsed.data.phone            !== undefined) updates.phone            = parsed.data.phone;
  if (parsed.data.email            !== undefined) updates.email            = parsed.data.email;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Нет данных для обновления' }, { status: 400 });
  }

  const { rows } = await pool.query(
    `UPDATE partners
     SET contacts   = contacts || $1::jsonb,
         updated_at = NOW()
     WHERE id = $2
     RETURNING id, contacts->>'telegram_chat_id' AS telegram_chat_id`,
    [JSON.stringify(updates), id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Оператор не найден' }, { status: 404 });
  }

  return NextResponse.json({
    success: true,
    telegram_chat_id: (rows[0] as { telegram_chat_id: string | null }).telegram_chat_id,
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const { id } = await params;

  const { rows } = await pool.query(
    `SELECT contacts, contacts->>'telegram_chat_id' AS telegram_chat_id
     FROM partners WHERE id = $1`,
    [id]
  );

  if (rows.length === 0) {
    return NextResponse.json({ error: 'Оператор не найден' }, { status: 404 });
  }

  return NextResponse.json({ success: true, ...(rows[0] as Record<string, unknown>) });
}
