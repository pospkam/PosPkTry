/**
 * POST /api/payments/tochka/qr
 * Создаёт СБП QR-код для бронирования.
 * Вызывается из BookingFormCard после успешного создания брони.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createSBPQR, isTochkaConfigured } from '@/lib/payments/tochka';
import { pool } from '@/lib/db-pool';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const limiter = createRateLimiter({ windowMs: 60_000, max: 10 });

const Schema = z.object({
  bookingId: z.number().int().positive(),
});

export async function POST(req: NextRequest) {
  const ip = getClientIp(req.headers);
  if (!limiter.check(ip)) {
    return NextResponse.json({ error: 'Слишком много запросов' }, { status: 429 });
  }

  if (!isTochkaConfigured()) {
    return NextResponse.json(
      { error: 'Оплата через СБП временно недоступна — обратитесь к оператору' },
      { status: 503 },
    );
  }

  try {
    const body = await req.json();
    const { bookingId } = Schema.parse(body);

    // Загружаем данные брони
    const { rows } = await pool.query<{
      final_price: number;
      title: string;
      tochka_qr_id: string | null;
    }>(
      `SELECT ob.final_price, ot.title, ob.tochka_qr_id
       FROM operator_bookings ob
       JOIN operator_tours ot ON ot.id = ob.operator_tour_id
       WHERE ob.id = $1 AND ob.booking_status IN ('new', 'pending_payment')
       LIMIT 1`,
      [bookingId],
    );

    if (!rows[0]) {
      return NextResponse.json({ error: 'Бронирование не найдено' }, { status: 404 });
    }

    const booking = rows[0];

    // Если QR уже создан — вернуть его повторно не получится (QR одноразовый),
    // просто сообщаем что оплата уже инициирована
    if (booking.tochka_qr_id) {
      return NextResponse.json({ error: 'Оплата уже создана для этой брони' }, { status: 409 });
    }

    const qr = await createSBPQR({
      amountRub:   Number(booking.final_price),
      description: `TourHab: ${booking.title} #${bookingId}`,
      ttlMinutes:  60,
      bookingId,
    });

    if (!qr) {
      return NextResponse.json({ error: 'Не удалось создать QR-код оплаты' }, { status: 502 });
    }

    // Сохраняем qrId в брони для webhook-сопоставления
    await pool.query(
      `UPDATE operator_bookings
       SET tochka_qr_id = $1, booking_status = 'pending_payment', updated_at = NOW()
       WHERE id = $2`,
      [qr.qrId, bookingId],
    ).catch(() => { /* не блокируем если колонки нет — добавим миграцией */ });

    return NextResponse.json({
      qrCode:    qr.qrCode,    // base64 PNG — показать как <img src="data:image/png;base64,...">
      qrLink:    qr.qrLink,    // deeplink для мобильных банков
      payload:   qr.payload,   // строка СБП для копирования
      expiresAt: qr.expiresAt,
      amount:    Number(booking.final_price),
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ошибка создания QR';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// ── GET: статус оплаты (polling из фронта) ─────────────────────────

export async function GET(req: NextRequest) {
  const bookingId = req.nextUrl.searchParams.get('bookingId');
  if (!bookingId) return NextResponse.json({ error: 'bookingId обязателен' }, { status: 400 });

  try {
    const { rows } = await pool.query<{
      booking_status: string;
      tochka_qr_id: string | null;
    }>(
      `SELECT booking_status, tochka_qr_id FROM operator_bookings WHERE id = $1 LIMIT 1`,
      [parseInt(bookingId, 10)],
    );

    const row = rows[0];
    if (!row) return NextResponse.json({ error: 'Не найдено' }, { status: 404 });

    return NextResponse.json({
      paid: row.booking_status === 'confirmed',
      status: row.booking_status,
    });
  } catch {
    return NextResponse.json({ error: 'Ошибка' }, { status: 500 });
  }
}
