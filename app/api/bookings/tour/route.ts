/**
 * POST /api/bookings/tour
 * Создание бронирования тура оператора + записи о платеже
 * Поддерживает многодневные туры — проверяет занятость КАЖДОГО дня диапазона
 * Auth: любой авторизованный пользователь (турист)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/lib/db-pool';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

const CreateTourBookingSchema = z.object({
  tourId:       z.number().int().positive(),
  bookingDate:  z.string().date('Формат даты: YYYY-MM-DD'),
  participants: z.number().int().min(1).max(100),
  touristName:  z.string().min(1).max(255).optional(),
  touristPhone: z.string().max(20).optional(),
});

/** Добавляет N дней к дате (UTC-safe) */
function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function POST(request: NextRequest) {
  const authOrResponse = await requireAuth(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;
  const { userId } = authOrResponse;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Некорректный JSON' }, { status: 400 });
  }

  const parsed = CreateTourBookingSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Некорректные данные' },
      { status: 400 }
    );
  }

  const { tourId, bookingDate, participants, touristName, touristPhone } = parsed.data;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Пользователь
    const userResult = await client.query<{ id: string; email: string; name: string }>(
      'SELECT id, email, name FROM users WHERE id = $1',
      [userId]
    );
    if (userResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, error: 'Пользователь не найден' }, { status: 404 });
    }
    const user = userResult.rows[0];

    // 2. Тур + оператор + длительность
    const tourResult = await client.query<{
      id: string; title: string; base_price: string;
      currency: string; operator_id: string;
      min_participants: number; max_participants: number;
      is_active: boolean;
      multi_day_count: number | null;
      duration_hours: number | null;
      duration_type: string | null;
      operator_name: string; commission_current: string;
    }>(
      `SELECT ot.id, ot.title, ot.base_price, ot.currency, ot.operator_id,
              ot.min_participants, ot.max_participants, ot.is_active,
              ot.multi_day_count, ot.duration_hours, ot.duration_type,
              p.name AS operator_name,
              COALESCE(p.commission_current, 15) AS commission_current
       FROM operator_tours ot
       JOIN partners p ON p.id = ot.operator_id
       WHERE ot.id = $1`,
      [tourId]
    );
    if (tourResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, error: 'Тур не найден' }, { status: 404 });
    }
    const tour = tourResult.rows[0];

    if (!tour.is_active) {
      await client.query('ROLLBACK');
      return NextResponse.json({ success: false, error: 'Тур недоступен для бронирования' }, { status: 400 });
    }
    if (participants < (tour.min_participants ?? 1)) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: `Минимальное количество участников: ${tour.min_participants}` },
        { status: 400 }
      );
    }
    if (participants > tour.max_participants) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { success: false, error: `Максимальное количество участников: ${tour.max_participants}` },
        { status: 400 }
      );
    }

    // 3. Вычисляем длительность тура в днях
    let durationDays = 1;
    if (tour.multi_day_count && tour.multi_day_count > 1) {
      durationDays = tour.multi_day_count;
    } else if (tour.duration_hours && tour.duration_hours >= 24) {
      durationDays = Math.ceil(tour.duration_hours / 24);
    }
    const endDate = addDays(bookingDate, durationDays - 1);

    // 4. Проверяем слот ТОЛЬКО для даты отправления (цена + отмена)
    const startSlotResult = await client.query<{
      id: string; available_slots: number; booked_slots: number;
      base_price_override: string | null; is_cancelled: boolean;
    }>(
      `SELECT id, available_slots, booked_slots, base_price_override, is_cancelled
       FROM tour_availability
       WHERE operator_tour_id = $1 AND date = $2`,
      [tourId, bookingDate]
    );

    let pricePerPerson = Number(tour.base_price);

    if (startSlotResult.rows.length > 0) {
      const startSlot = startSlotResult.rows[0];
      if (startSlot.is_cancelled) {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'Выбранная дата отменена' }, { status: 400 });
      }
      if (startSlot.base_price_override) {
        pricePerPerson = Number(startSlot.base_price_override);
      }
    }

    // 5. Проверяем занятость КАЖДОГО дня диапазона через v_tour_daily_occupancy
    //    Fallback на max_participants если tour_availability не задана
    const occupancyResult = await client.query<{
      date: string; occupied: string; available_slots: string | null; is_cancelled: boolean | null;
    }>(
      `SELECT
         d.day::date AS date,
         COALESCE(occ.occupied, 0) AS occupied,
         ta.available_slots,
         ta.is_cancelled
       FROM generate_series($1::date, $2::date, '1 day') AS d(day)
       LEFT JOIN v_tour_daily_occupancy occ
              ON occ.operator_tour_id = $3 AND occ.date = d.day::date
       LEFT JOIN tour_availability ta
              ON ta.operator_tour_id = $3 AND ta.date = d.day::date
       ORDER BY d.day`,
      [bookingDate, endDate, tourId]
    );

    for (const row of occupancyResult.rows) {
      if (row.is_cancelled) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: `Дата ${row.date} в выбранном диапазоне отменена` },
          { status: 400 }
        );
      }
      const capacity = row.available_slots != null
        ? Number(row.available_slots)
        : tour.max_participants;
      const occupied = Number(row.occupied);
      const free = capacity - occupied;
      if (free < participants) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: `На дату ${row.date} недостаточно мест (доступно: ${free})` },
          { status: 400 }
        );
      }
    }

    // 6. Декрементируем booked_slots для всех дат диапазона в tour_availability
    if (durationDays > 1) {
      await client.query(
        `UPDATE tour_availability
         SET booked_slots = booked_slots + $1
         WHERE operator_tour_id = $2
           AND date BETWEEN $3::date AND $4::date
           AND is_cancelled IS NOT TRUE`,
        [participants, tourId, bookingDate, endDate]
      );
    } else if (startSlotResult.rows.length > 0) {
      await client.query(
        'UPDATE tour_availability SET booked_slots = booked_slots + $1 WHERE id = $2',
        [participants, startSlotResult.rows[0].id]
      );
    }

    // 7. Финансовый расчёт
    const baseTotal      = pricePerPerson * participants;
    const finalPrice     = baseTotal;
    const commissionRate = Number(tour.commission_current);
    const commissionAmt  = Number((finalPrice * commissionRate / 100).toFixed(2));
    const netAmount      = Number((finalPrice - commissionAmt).toFixed(2));

    // 8. Создаём operator_booking с end_date и duration_days
    const bookingResult = await client.query<{ id: string }>(
      `INSERT INTO operator_bookings (
         operator_tour_id, tourist_name, tourist_email, tourist_phone,
         booking_date, end_date, duration_days, participants,
         base_total_price, final_price, currency,
         payment_status, payment_method, booking_status, created_via, metadata
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'pending','cloudpayments','new','website',$12)
       RETURNING id`,
      [
        tourId,
        touristName ?? user.name,
        user.email,
        touristPhone ?? null,
        bookingDate,
        endDate,
        durationDays,
        participants,
        baseTotal,
        finalPrice,
        tour.currency ?? 'RUB',
        JSON.stringify({ user_id: userId }),
      ]
    );
    const bookingId = bookingResult.rows[0].id;

    // 9. Создаём tour_payment (PENDING)
    const paymentResult = await client.query<{ id: string }>(
      `INSERT INTO tour_payments (
         booking_id, operator_id,
         retail_amount, net_amount, commission_amount, commission_rate, currency,
         status, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,'PENDING',NOW(),NOW())
       RETURNING id`,
      [bookingId, tour.operator_id, finalPrice, netAmount, commissionAmt, commissionRate, tour.currency ?? 'RUB']
    );
    const paymentId = paymentResult.rows[0].id;

    await client.query('COMMIT');

    // 10. Ответ — параметры для CloudPayments
    const dateDisplay = new Date(bookingDate + 'T00:00:00Z').toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric',
    });
    const durationLabel = durationDays > 1 ? ` · ${durationDays} дн.` : '';

    return NextResponse.json({
      success: true,
      data: {
        bookingId,
        paymentId,
        amount:       finalPrice,
        currency:     tour.currency ?? 'RUB',
        description:  `${tour.title} · ${dateDisplay}${durationLabel} · ${participants} чел.`,
        invoiceId:    paymentId,
        accountId:    userId,
        email:        user.email,
        tourTitle:    tour.title,
        operatorName: tour.operator_name,
        durationDays,
        endDate,
      },
    });
  } catch (err) {
    await client.query('ROLLBACK');
    return NextResponse.json(
      { success: false, error: 'Ошибка создания бронирования', detail: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
