/**
 * POST /api/bookings/tour
 * Создание бронирования тура оператора + записи о платеже
 * Возвращает параметры для виджета CloudPayments
 * Auth: любой авторизованный пользователь (турист)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/lib/db-pool';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

const CreateTourBookingSchema = z.object({
  tourId:      z.number().int().positive(),
  bookingDate: z.string().date('Формат даты: YYYY-MM-DD'),
  participants: z.number().int().min(1).max(100),
  touristName:  z.string().min(1).max(255).optional(),
  touristPhone: z.string().max(20).optional(),
});

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

    // 2. Тур + оператор
    const tourResult = await client.query<{
      id: string; title: string; base_price: string;
      currency: string; operator_id: string;
      min_participants: number; max_participants: number;
      is_active: boolean;
      operator_name: string; commission_current: string;
    }>(
      `SELECT ot.id, ot.title, ot.base_price, ot.currency, ot.operator_id,
              ot.min_participants, ot.max_participants, ot.is_active,
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

    // 3. Проверка слота доступности (если существует)
    const slotResult = await client.query<{
      id: string; available_slots: number; booked_slots: number;
      base_price_override: string | null; is_cancelled: boolean;
    }>(
      `SELECT id, available_slots, booked_slots, base_price_override, is_cancelled
       FROM tour_availability
       WHERE operator_tour_id = $1 AND date = $2`,
      [tourId, bookingDate]
    );

    let pricePerPerson = Number(tour.base_price);

    if (slotResult.rows.length > 0) {
      const slot = slotResult.rows[0];
      if (slot.is_cancelled) {
        await client.query('ROLLBACK');
        return NextResponse.json({ success: false, error: 'Выбранная дата отменена' }, { status: 400 });
      }
      const freeSlots = slot.available_slots - slot.booked_slots;
      if (freeSlots < participants) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { success: false, error: `Недостаточно мест (доступно: ${freeSlots})` },
          { status: 400 }
        );
      }
      if (slot.base_price_override) pricePerPerson = Number(slot.base_price_override);
      // Декрементируем слот
      await client.query(
        'UPDATE tour_availability SET booked_slots = booked_slots + $1 WHERE id = $2',
        [participants, slot.id]
      );
    }

    // 4. Финансовый расчёт
    const baseTotal      = pricePerPerson * participants;
    const finalPrice     = baseTotal;
    const commissionRate = Number(tour.commission_current);
    const commissionAmt  = Number((finalPrice * commissionRate / 100).toFixed(2));
    const netAmount      = Number((finalPrice - commissionAmt).toFixed(2));

    // 5. Создаём operator_booking
    const bookingResult = await client.query<{ id: string }>(
      `INSERT INTO operator_bookings (
         operator_tour_id, tourist_name, tourist_email, tourist_phone,
         booking_date, participants,
         base_total_price, final_price, currency,
         payment_status, payment_method, booking_status, created_via, metadata
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'pending','cloudpayments','new','website',$10)
       RETURNING id`,
      [
        tourId,
        touristName ?? user.name,
        user.email,
        touristPhone ?? null,
        bookingDate,
        participants,
        baseTotal,
        finalPrice,
        tour.currency ?? 'RUB',
        JSON.stringify({ user_id: userId }),
      ]
    );
    const bookingId = bookingResult.rows[0].id;

    // 6. Создаём tour_payment (PENDING)
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

    // 7. Ответ — параметры для CloudPayments
    const dateDisplay = new Date(bookingDate).toLocaleDateString('ru-RU', {
      day: 'numeric', month: 'long', year: 'numeric',
    });

    return NextResponse.json({
      success: true,
      data: {
        bookingId,
        paymentId,
        amount:       finalPrice,
        currency:     tour.currency ?? 'RUB',
        description:  `${tour.title} · ${dateDisplay} · ${participants} чел.`,
        invoiceId:    paymentId,
        accountId:    userId,
        email:        user.email,
        tourTitle:    tour.title,
        operatorName: tour.operator_name,
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
