/**
 * POST /api/hub/bookings/create
 * Create new booking
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const BookingSchema = z.object({
  tour_id: z.number().positive(),
  tourist_name: z.string().min(2).max(255),
  tourist_email: z.string().email(),
  tourist_phone: z.string().min(10).max(20),
  participants_count: z.number().min(1).max(100),
  booking_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Формат даты: YYYY-MM-DD'),
  special_requests: z.string().max(2000).optional()
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const data = BookingSchema.parse(body);

    // Get tour info
    const tourResult = await pool.query(
      `SELECT partner_id, base_price FROM operator_tours WHERE id = $1 AND deleted_at IS NULL`,
      [data.tour_id]
    );

    if (tourResult.rows.length === 0) {
      return NextResponse.json({ error: 'Тур не найден' }, { status: 404 });
    }

    const { partner_id, base_price } = tourResult.rows[0];
    const total_price = base_price * data.participants_count;

    // Create booking
    const bookingResult = await pool.query(
      `INSERT INTO operator_bookings (
        tour_id, partner_id, tourist_name, tourist_email, tourist_phone,
        participants_count, booking_date, special_requests, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'new', NOW())
      RETURNING id`,
      [
        data.tour_id,
        partner_id,
        data.tourist_name,
        data.tourist_email,
        data.tourist_phone,
        data.participants_count,
        data.booking_date,
        data.special_requests || ''
      ]
    );

    const bookingId = bookingResult.rows[0]?.id;

    // Create payment record (will be updated when tourist pays)
    await pool.query(
      `INSERT INTO tour_payments (booking_id, amount_kopecks, payment_status, created_at)
       VALUES ($1, $2, 'pending', NOW())`,
      [bookingId, total_price * 100] // Convert to kopecks
    );

    return NextResponse.json({
      success: true,
      booking_id: bookingId,
      total_price,
      message: 'Бронирование создано. Ожидается оплата.'
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Неверные данные' },
        { status: 400 }
      );
    }

    console.error('[Booking Create]', err);
    return NextResponse.json(
      { error: 'Ошибка при создании бронирования' },
      { status: 500 }
    );
  }
}
