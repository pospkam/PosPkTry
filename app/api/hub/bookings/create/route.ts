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

const BOOKING_ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND:      'Тур не найден или больше не доступен. Попробуйте выбрать другой тур.',
  DATE_PAST:      'Выбранная дата уже прошла. Укажите будущую дату.',
  NO_SLOTS:       'На выбранную дату нет свободных мест. Выберите другую дату или свяжитесь с оператором.',
  MAX_EXCEEDED:   'Превышено максимальное число участников для этого тура.',
};

const BookingSchema = z.object({
  tour_id:             z.number().positive({ message: 'Укажите тур' }),
  tourist_name:        z.string().min(2, 'Имя: минимум 2 символа').max(255),
  tourist_email:       z.string().email('Неверный формат email'),
  tourist_phone:       z.string().min(10, 'Телефон слишком короткий').max(20),
  participants_count:  z.number().min(1, 'Минимум 1 участник').max(100, 'Максимум 100 участников'),
  booking_date:        z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Формат даты: YYYY-MM-DD'),
  special_requests:    z.string().max(2000).optional(),
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

    // Дата не должна быть в прошлом
    if (new Date(data.booking_date) < new Date(new Date().toISOString().slice(0, 10))) {
      return NextResponse.json({ error: BOOKING_ERROR_MESSAGES.DATE_PAST }, { status: 422 });
    }

    const result = await transaction(async (client) => {
      const tourResult = await client.query(
        `SELECT operator_id, base_price, max_participants, available_slots
         FROM operator_tours
         WHERE id = $1 AND is_active = true AND deleted_at IS NULL FOR UPDATE`,
        [data.tour_id]
      );

      if (tourResult.rows.length === 0) {
        throw Object.assign(new Error(BOOKING_ERROR_MESSAGES.NOT_FOUND), { code: 'NOT_FOUND' });
      }

      const tour = tourResult.rows[0] as { base_price: number; max_participants: number | null; available_slots: number | null };

      if (tour.max_participants != null && data.participants_count > tour.max_participants) {
        throw Object.assign(
          new Error(`${BOOKING_ERROR_MESSAGES.MAX_EXCEEDED} (максимум: ${tour.max_participants})`),
          { code: 'MAX_EXCEEDED' }
        );
      }

      if (tour.available_slots != null && tour.available_slots < data.participants_count) {
        throw Object.assign(
          new Error(tour.available_slots === 0
            ? BOOKING_ERROR_MESSAGES.NO_SLOTS
            : `Недостаточно мест. Доступно: ${tour.available_slots}, запрашивается: ${data.participants_count}`),
          { code: 'NO_SLOTS' }
        );
      }

      const total_price = Number(tour.base_price) * data.participants_count;

      const bookingResult = await client.query(
        `INSERT INTO operator_bookings (
          operator_tour_id, tour_id, tourist_name, tourist_email, tourist_phone,
          participants, booking_date, special_requests, booking_status,
          base_total_price, final_price, created_via
        ) VALUES ($1, $1, $2, $3, $4, $5, $6, $7, 'new', $8, $8, 'website')
        RETURNING id`,
        [
          data.tour_id,
          data.tourist_name,
          data.tourist_email,
          data.tourist_phone,
          data.participants_count,
          data.booking_date,
          data.special_requests ?? '',
          total_price,
        ]
      );

      const bookingId = (bookingResult.rows[0] as { id: number }).id;
      return { bookingId, total_price };
    });

    return NextResponse.json({
      success:    true,
      booking_id: result.bookingId,
      total_price: result.total_price,
      message:    'Бронирование создано. Ожидается оплата.',
    });

  } catch (err) {
    if (err instanceof z.ZodError) {
      const first = err.errors[0];
      return NextResponse.json(
        { error: first?.message ?? 'Неверные данные формы', field: first?.path?.[0] },
        { status: 400 }
      );
    }
    if (err instanceof Error) {
      const code = (err as NodeJS.ErrnoException & { code?: string }).code;
      if (code && BOOKING_ERROR_MESSAGES[code]) {
        const status = code === 'NOT_FOUND' ? 404 : 422;
        return NextResponse.json({ error: err.message }, { status });
      }
    }
    return NextResponse.json(
      { error: 'Не удалось создать бронирование. Попробуйте позже или свяжитесь с оператором напрямую.' },
      { status: 500 }
    );
  }
}
