/**
 * GET /api/telegram/connect
 *
 * Генерирует персональную ссылку для привязки Telegram-аккаунта.
 * Ссылка действительна 30 минут.
 * Требует авторизации.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth/middleware';
import { query } from '@/lib/database';
import { buildConnectLink } from '@/lib/telegram/connect-token';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authOrResponse = await requireAuth(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  // Проверяем — может уже привязан
  const res = await query<{ telegram_id: string | null; telegram_username: string | null }>(
    `SELECT telegram_id::text, telegram_username FROM users WHERE id = $1`,
    [authOrResponse.userId]
  );
  const user = res.rows[0];

  if (user?.telegram_id) {
    return NextResponse.json({
      linked: true,
      username: user.telegram_username ?? null,
    });
  }

  const link = buildConnectLink(authOrResponse.userId);

  return NextResponse.json({
    linked: false,
    link,
  });
}
