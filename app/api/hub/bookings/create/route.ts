/**
 * POST /api/hub/bookings/create
 * Create new booking + уведомление оператору в Telegram
 */

import { NextRequest, NextResponse } from 'next/server';
import { transaction } from '@/lib/database';
import { pool } from '@/lib/db-pool';
import { z } from 'zod';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { notifyNewBooking } from '@/lib/notifications/operator-booking';

export const dynamic = 'force-dynamic';

const bookingCreateLimiter = createRateLimiter({ windowMs: 60_000, max: 5 });

const BOOKING_ERROR_MESSAGES: Record<string, string> = {
  NOT_FOUND:    'Тур не найден или больше не доступен. Попробуйте выбрать другой тур.',
  DATE_PAST:    'Выбранная дата уже прошла. Укажите будущую дату.',
  NO_SLOTS:     'На выбранную дату нет свободных мест. Выберите другую дату или свяжитесь с оператором.',
  MAX_EXCEEDED: 'Превышено максимальное число участников для этого тура.',
};

const BookingSchema = z.object({
  tour_id:            z.number().positive({ message: 'Укажите тур' }),
  tourist_name:       z.string().min(2, 'Имя: минимум 2 символа').max(255),
  tourist_email:      z.string().email('Неверный формат email').optional(),
  tourist_phone:      z.string().min(10, 'Телефон слишком короткий').max(20),
  participants_count: z.number().min(1, 'Минимум 1 участник').max(100),
  booking_date:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Формат даты: YYYY-MM-DD'),
  special_requests:   z.string().max(2000).optional(),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  if (!bookingCreateLimiter.check(ip)) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте через минуту.' },
      { status: 429 },
    );
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Невалидный JSON' }, { status: 400 });
  }

  const parsed = BookingSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return NextResponse.json(
      { error: first?.message ?? 'Неверные данные формы', field: first?.path?.[0] },
      { status: 400 },
    );
  }

  const data = parsed.data;

  if (new Date(data.booking_date) < new Date(new Date().toISOString().slice(0, 10))) {
    return NextResponse.json({ error: BOOKING_ERROR_MESSAGES.DATE_PAST }, { status: 422 });
  }

  try {
    const result = await transaction(async (client) => {
      const tourResult = await client.query<{
        operator_id: string;
        title: string;
        base_price: number;
        max_participants: number | null;
        available_slots: number | null;
      }>(
        `SELECT ot.operator_id, ot.title, ot.base_price, ot.max_participants, ot.available_slots
         FROM operator_tours ot
         WHERE ot.id = $1 AND ot.is_active = true AND ot.is_published = true AND ot.deleted_at IS NULL FOR UPDATE`,
        [data.tour_id],
      );

      if (tourResult.rows.length === 0) {
        throw Object.assign(new Error(BOOKING_ERROR_MESSAGES.NOT_FOUND), { code: 'NOT_FOUND' });
      }

      const tour = tourResult.rows[0]!;

      if (tour.max_participants != null && data.participants_count > tour.max_participants) {
        throw Object.assign(
          new Error(`${BOOKING_ERROR_MESSAGES.MAX_EXCEEDED} (максимум: ${tour.max_participants})`),
          { code: 'MAX_EXCEEDED' },
        );
      }

      // Count actual confirmed bookings for this date within the same transaction.
      // FOR UPDATE on the tour row above serialises concurrent requests, so this
      // read is consistent: no other booking for this tour can commit until we do.
      const slotCheckResult = await client.query<{ already_booked: string }>(
        `SELECT COALESCE(SUM(participants), 0) AS already_booked
         FROM operator_bookings
         WHERE operator_tour_id = $1
           AND booking_date = $2
           AND booking_status NOT IN ('cancelled', 'rejected')`,
        [data.tour_id, data.booking_date],
      );
      const alreadyBooked = parseInt(slotCheckResult.rows[0]!.already_booked, 10);

      if (tour.max_participants != null && alreadyBooked + data.participants_count > tour.max_participants) {
        const remaining = tour.max_participants - alreadyBooked;
        throw Object.assign(
          new Error(remaining <= 0
            ? BOOKING_ERROR_MESSAGES.NO_SLOTS
            : `Недостаточно мест на эту дату. Доступно: ${remaining}, запрашивается: ${data.participants_count}`),
          { code: 'NO_SLOTS' },
        );
      }

      const total_price = Number(tour.base_price) * data.participants_count;

      const bookingResult = await client.query<{ id: number }>(
        `INSERT INTO operator_bookings (
           operator_tour_id, tourist_name, tourist_email, tourist_phone,
           participants, booking_date, special_requests, booking_status,
           base_total_price, final_price, created_via
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'new', $8, $8, 'website')
         RETURNING id`,
        [
          data.tour_id,
          data.tourist_name,
          data.tourist_email ?? null,
          data.tourist_phone,
          data.participants_count,
          data.booking_date,
          data.special_requests ?? '',
          total_price,
        ],
      );

      const bookingId = bookingResult.rows[0]!.id;
      return { bookingId, total_price, tour };
    });

    // Уведомление оператору — fire-and-forget, не блокирует ответ
    void (async () => {
      try {
        const opRow = await pool.query<{ name: string; telegram_chat_id: string | null; max_chat_id: number | null }>(
          `SELECT name, telegram_chat_id, max_chat_id FROM partners WHERE id = $1 LIMIT 1`,
          [result.tour.operator_id],
        );
        const op = opRow.rows[0];
        await notifyNewBooking({
          booking_id:                String(result.bookingId),
          tour_title:                result.tour.title,
          tourist_name:              data.tourist_name,
          tourist_phone:             data.tourist_phone,
          tourist_email:             data.tourist_email,
          booking_date:              data.booking_date,
          participants:              data.participants_count,
          final_price:               result.total_price,
          operator_name:             op?.name ?? 'Оператор',
          operator_telegram_chat_id: op?.telegram_chat_id ?? undefined,
          operator_max_chat_id:      op?.max_chat_id ?? undefined,
          via:                       'website',
        });
      } catch {
        // Non-fatal
      }
    })();

    return NextResponse.json({
      id:          result.bookingId,
      booking_id:  result.bookingId,
      total_price: result.total_price,
      message:     'Заявка создана. Перед оплатой проверьте детали и условия тура.',
    });

  } catch (err) {
    if (err instanceof Error) {
      const code = (err as NodeJS.ErrnoException & { code?: string }).code;
      if (code && BOOKING_ERROR_MESSAGES[code]) {
        const status = code === 'NOT_FOUND' ? 404 : 422;
        return NextResponse.json({ error: err.message }, { status });
      }
    }
    return NextResponse.json(
      { error: 'Не удалось создать бронирование. Попробуйте позже или свяжитесь с оператором напрямую.' },
      { status: 500 },
    );
  }
}
