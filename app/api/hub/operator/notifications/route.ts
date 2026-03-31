/**
 * GET /api/hub/operator/notifications
 * Реальные уведомления оператора из БД:
 * - Новые бронирования
 * - Отмены бронирований
 * - Новые отзывы
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireOperator(req);
  if (auth instanceof NextResponse) return auth;

  const { searchParams } = new URL(req.url);
  const filter = searchParams.get('filter') ?? 'all'; // all | unread

  // Получить operator_id для этого user
  const opRow = await pool.query<{ id: string }>(
    `SELECT id FROM partners WHERE user_id = $1 LIMIT 1`,
    [auth.userId]
  );
  if (!opRow.rows[0]) {
    return NextResponse.json({ notifications: [] });
  }
  const operatorId = opRow.rows[0].id;

  type BookingRow = { id: string; tourist_name: string | null; booking_status: string; created_at: string; tour_title: string; final_price: string | null };
  type ReviewRow  = { id: string; rating: string; created_at: string; tour_title: string; reviewer_name: string | null };

  // Бронирования: последние 30
  const bookings = await pool.query<BookingRow>(
    `SELECT ob.id::text, ob.tourist_name, ob.booking_status,
            ob.created_at::text, ot.title AS tour_title,
            ob.final_price::text
     FROM operator_bookings ob
     JOIN operator_tours ot ON ot.id = ob.operator_tour_id
     WHERE ot.operator_id = $1 AND ob.deleted_at IS NULL
     ORDER BY ob.created_at DESC
     LIMIT 30`,
    [operatorId]
  ).catch(() => ({ rows: [] as BookingRow[] }));

  // Отзывы: последние 10
  const reviews = await pool.query<ReviewRow>(
    `SELECT r.id::text, r.rating::text, r.created_at::text,
            ot.title AS tour_title,
            COALESCE(u.full_name, 'Турист') AS reviewer_name
     FROM operator_reviews r
     JOIN operator_tours ot ON ot.id = r.tour_id
     LEFT JOIN users u ON u.id = r.user_id
     WHERE ot.operator_id = $1
     ORDER BY r.created_at DESC
     LIMIT 10`,
    [operatorId]
  ).catch(() => ({ rows: [] as ReviewRow[] }));

  // Формируем единый список уведомлений
  type NType = 'booking' | 'cancellation' | 'review';
  interface Notification {
    id: string; type: NType; title: string; message: string;
    time: string; read: boolean; created_at: string;
  }

  const now = Date.now();
  function relativeTime(iso: string): string {
    const diff = now - new Date(iso).getTime();
    const min = Math.floor(diff / 60_000);
    if (min < 60) return `${min} мин. назад`;
    const h = Math.floor(min / 60);
    if (h < 24) return `${h} ч. назад`;
    const d = Math.floor(h / 24);
    if (d === 1) return 'вчера';
    return `${d} д. назад`;
  }

  const items: Notification[] = [];

  for (const b of bookings.rows) {
    const isCancelled = b.booking_status === 'cancelled';
    const price = b.final_price ? ` — ${Number(b.final_price).toLocaleString('ru')} ₽` : '';
    items.push({
      id:         `b-${b.id}`,
      type:       isCancelled ? 'cancellation' : 'booking',
      title:      isCancelled ? 'Отмена бронирования' : 'Новое бронирование',
      message:    isCancelled
        ? `${b.tourist_name ?? 'Турист'} отменил(а) "${b.tour_title}"`
        : `${b.tourist_name ?? 'Турист'} забронировал(а) "${b.tour_title}"${price}`,
      time:       relativeTime(b.created_at),
      read:       isCancelled ? true : b.booking_status !== 'new',
      created_at: b.created_at,
    });
  }

  for (const r of reviews.rows) {
    items.push({
      id:         `r-${r.id}`,
      type:       'review',
      title:      'Новый отзыв',
      message:    `${r.reviewer_name} оставил(а) ${r.rating} — "${r.tour_title}"`,
      time:       relativeTime(r.created_at),
      read:       false,
      created_at: r.created_at,
    });
  }

  // Сортируем по времени, новые первые
  items.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  const filtered = filter === 'unread' ? items.filter(n => !n.read) : items;

  return NextResponse.json({ notifications: filtered, total: items.length });
}
