import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!/^[0-9a-f-]{36}$/i.test(token)) {
    return NextResponse.json({ success: false, error: 'Неверный токен' }, { status: 400 });
  }

  try {
    const { rows } = await pool.query<{
      id: string;
      title: string;
      arrival_date: string | null;
      departure_date: string | null;
      places: string[];
      activities: string[];
      days: unknown;
      transport_by_day: unknown;
    }>(
      `SELECT id, title, arrival_date, departure_date, places, activities, days, transport_by_day
       FROM user_trips
       WHERE share_token = $1 AND is_public = TRUE AND deleted_at IS NULL`,
      [token]
    );

    if (rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Маршрут не найден или не опубликован' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: rows[0] });
  } catch {
    return NextResponse.json({ success: false, error: 'Ошибка сервера' }, { status: 500 });
  }
}
