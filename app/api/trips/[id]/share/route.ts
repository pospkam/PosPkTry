import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { requireAuth } from '@/lib/auth/middleware';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authOrResponse = await requireAuth(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;
  const { userId } = authOrResponse;
  const { id } = await params;

  try {
    const { rows } = await pool.query<{ share_token: string }>(
      `UPDATE user_trips
       SET is_public = TRUE
       WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL
       RETURNING share_token`,
      [id, userId]
    );

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Маршрут не найден' }, { status: 404 });
    }

    const shareToken = rows[0].share_token;
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://tourhab.ru';
    return NextResponse.json({
      success: true,
      shareToken,
      shareUrl: `${baseUrl}/trip/${shareToken}`,
    });
  } catch {
    return NextResponse.json({ success: false, error: 'Ошибка сервера' }, { status: 500 });
  }
}
