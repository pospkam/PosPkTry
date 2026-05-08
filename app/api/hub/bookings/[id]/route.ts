/**
 * GET /api/hub/bookings/[id]
 * Публичный эндпоинт для страницы подтверждения бронирования.
 * Возвращает основные данные брони по числовому ID.
 * Персональные данные туриста (phone, email) — не возвращаются (ФЗ-152).
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { makePdfToken } from '@/lib/pdf/pdf-token';

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
    participants: number;
    tourist_name: string;
    booking_status: string;
    base_price: number;
    operator_name: string;
    operator_phone: string | null;
    operator_telegram: string | null;
    final_price: string;
    payment_status: string;
  }>(
    `SELECT
       b.id,
       t.title            AS tour_title,
       b.booking_date,
       b.participants,
       b.tourist_name,
       b.booking_status,
       b.final_price,
       b.payment_status,
       t.base_price,
       COALESCE(p.name, u.name, u.email) AS operator_name,
       COALESCE(p.contacts->>'phone', u.phone)    AS operator_phone,
       COALESCE(p.contacts->>'telegram', u.telegram_username) AS operator_telegram
     FROM operator_bookings b
     JOIN operator_tours   t ON t.id = COALESCE(b.operator_tour_id, b.tour_id)
     LEFT JOIN partners    p ON p.id = t.operator_id
     LEFT JOIN users       u ON u.id = p.user_id
     WHERE b.id = $1`,
    [id]
  );

  if (!r.rows[0]) {
    return NextResponse.json({ error: 'Бронирование не найдено' }, { status: 404 });
  }

  const row = r.rows[0];
  const finalPrice = parseFloat(row.final_price ?? '0') || (row.base_price * row.participants);

  return NextResponse.json({
    success: true,
    data: {
      id: row.id,
      tour_title: row.tour_title,
      booking_date: row.booking_date,
      participants_count: row.participants,
      tourist_name: row.tourist_name,
      status: row.booking_status,
      payment_status: row.payment_status,
      total_price: finalPrice,
      operator_name: row.operator_name,
      operator_phone: row.operator_phone,
      operator_telegram: row.operator_telegram,
      cp_public_id: process.env.CLOUDPAYMENTS_PUBLIC_ID ?? '',
      pdf_token: makePdfToken(row.id),
    },
  });
}
