/**
 * GET /api/hub/bookings/[id]
 * Публичный эндпоинт для страницы подтверждения бронирования.
 * Возвращает основные данные брони по числовому ID.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const id = parseInt(params.id, 10);
  if (isNaN(id) || id <= 0) {
    return NextResponse.json({ error: 'Неверный ID' }, { status: 400 });
  }

  const r = await query<{
    id: number;
    tour_title: string;
    booking_date: string;
    participants_count: number;
    tourist_name: string;
    tourist_email: string;
    booking_status: string;
    base_price: number;
    operator_name: string;
    operator_phone: string | null;
    operator_telegram: string | null;
  }>(
    `SELECT
       b.id,
       t.title            AS tour_title,
       b.booking_date,
       b.participants_count,
       b.tourist_name,
       b.tourist_email,
       b.booking_status,
       t.base_price,
       p.name             AS operator_name,
       p.contacts->>'phone'    AS operator_phone,
       p.contacts->>'telegram' AS operator_telegram
     FROM operator_bookings b
     JOIN operator_tours   t ON t.id = b.tour_id
     JOIN partners         p ON p.id = b.partner_id
     WHERE b.id = $1`,
    [id]
  );

  if (!r.rows[0]) {
    return NextResponse.json({ error: 'Бронирование не найдено' }, { status: 404 });
  }

  const row = r.rows[0];
  return NextResponse.json({
    success: true,
    data: {
      id: row.id,
      tour_title: row.tour_title,
      booking_date: row.booking_date,
      participants_count: row.participants_count,
      tourist_name: row.tourist_name,
      tourist_email: row.tourist_email,
      status: row.booking_status,
      total_price: row.base_price * row.participants_count,
      operator_name: row.operator_name,
      operator_phone: row.operator_phone,
      operator_telegram: row.operator_telegram,
    },
  });
}
