import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/lib/db-pool';
import { verifyPassword, hashPassword } from '@/lib/auth/password';
import { requireAuth } from '@/lib/auth/middleware';

const Schema = z.object({
  current_password: z.string().min(1, 'Текущий пароль обязателен'),
  new_password: z.string().min(8, 'Новый пароль — минимум 8 символов'),
});

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;

  const body = await req.json();
  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message },
      { status: 400 }
    );
  }

  const { current_password, new_password } = parsed.data;

  const client = await pool.connect();
  try {
    const userRes = await client.query(
      `SELECT password_hash, preferences FROM users WHERE id = $1`,
      [auth.userId]
    );
    if (!userRes.rows[0]) {
      return NextResponse.json({ success: false, error: 'Пользователь не найден' }, { status: 404 });
    }

    const valid = await verifyPassword(current_password, userRes.rows[0].password_hash as string);
    if (!valid) {
      return NextResponse.json({ success: false, error: 'Текущий пароль неверен' }, { status: 400 });
    }

    const newHash = await hashPassword(new_password);

    // Clear force_password_change flag if present
    const prefs = (userRes.rows[0].preferences as Record<string, unknown>) || {};
    delete prefs.force_password_change;

    await client.query(
      `UPDATE users SET password_hash = $1, preferences = $2::jsonb, updated_at = NOW()
       WHERE id = $3`,
      [newHash, JSON.stringify(prefs), auth.userId]
    );

    return NextResponse.json({ success: true });
  } finally {
    client.release();
  }
}
