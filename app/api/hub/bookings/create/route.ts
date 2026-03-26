/**
 * POST /api/hub/bookings/create
 * Create new booking
 */

import { NextRequest, NextResponse } from 'next/server';
import { transaction } from '@/lib/database';
import { z } from 'zod';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const bookingCreateLimiter = createRateLimiter({ windowMs: 60_000, max: 5 }); // 5/мин per IP

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
  const ip = getClientIp(req.headers);
  if (!bookingCreateLimiter.check(ip)) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте через минуту.' },
      { status: 429 }
    );
  }

  try {
    const body = await req.json();
    const data = BookingSchema.parse(body);

    const result = await transaction(async (client) => {
      // Lock tour row to prevent race condition
      const tourResult = await client.query(
        `SELECT partner_id, base_price FROM operator_tours
         WHERE id = $1 AND deleted_at IS NULL FOR UPDATE`,
        [data.tour_id]
      );

      if (tourResult.rows.length === 0) {
        throw Object.assign(new Error('Тур не найден'), { code: 'NOT_FOUND' });
      }

      const { partner_id, base_price } = tourResult.rows[0] as { partner_id: number; base_price: number };
      const total_price = base_price * data.participants_count;

      const bookingResult = await client.query(
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
          data.special_requests ?? '',
        ]
      );

      const bookingId = (bookingResult.rows[0] as { id: number }).id;

      await client.query(
        `INSERT INTO tour_payments (booking_id, amount_kopecks, payment_status, created_at)
         VALUES ($1, $2, 'pending', NOW())`,
        [bookingId, total_price * 100]
      );

      return { bookingId, total_price };
    });

    return NextResponse.json({
      success: true,
      booking_id: result.bookingId,
      total_price: result.total_price,
      message: 'Бронирование создано. Ожидается оплата.',
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json({ error: 'Неверные данные' }, { status: 400 });
    }
    if (err instanceof Error && (err as NodeJS.ErrnoException).code === 'NOT_FOUND') {
      return NextResponse.json({ error: 'Тур не найден' }, { status: 404 });
    }
    return NextResponse.json({ error: 'Ошибка при создании бронирования' }, { status: 500 });
  }
}
