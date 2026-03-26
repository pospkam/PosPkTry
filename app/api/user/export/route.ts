/**
 * GET /api/user/export
 *
 * GDPR / 152-ФЗ: выгрузка всех персональных данных пользователя в JSON.
 * Auth: текущий пользователь (собственные данные).
 */
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (auth instanceof NextResponse) return auth;
  const userId = auth.userId;

  const [
    userRes, bookingsRes, leadsRes, reviewsRes, chatsRes,
  ] = await Promise.all([
    pool.query(
      `SELECT id, name, email, phone, role, created_at, updated_at
       FROM users WHERE id = $1`,
      [userId]
    ),
    pool.query(
      `SELECT id, status, created_at, total_price
       FROM bookings WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 200`,
      [userId]
    ),
    pool.query(
      `SELECT id, name, phone, email, comment, status, created_at
       FROM leads WHERE email = (SELECT email FROM users WHERE id = $1)
       ORDER BY created_at DESC LIMIT 200`,
      [userId]
    ),
    pool.query(
      `SELECT id, rating, comment, created_at
       FROM reviews WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 200`,
      [userId]
    ),
    pool.query(
      `SELECT id, created_at, updated_at
       FROM chat_sessions WHERE user_id = $1
       ORDER BY created_at DESC LIMIT 50`,
      [userId]
    ),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    user: userRes.rows[0] ?? null,
    bookings: bookingsRes.rows,
    leads: leadsRes.rows,
    reviews: reviewsRes.rows,
    chat_sessions: chatsRes.rows,
  };

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="tourhab-export-${userId}.json"`,
    },
  });
}
