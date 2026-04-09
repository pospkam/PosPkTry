import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { requireOperator } from '@/lib/auth/middleware';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

// ─── Schema ───────────────────────────────────────────────────────────────────

const SetAvailabilitySchema = z.object({
  tourId:          z.coerce.number().int().positive('tourId обязателен'),
  date:            z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'date: формат YYYY-MM-DD'),
  availableSlots:  z.number().int().min(0).optional(),
  isBlocked:       z.boolean().optional(),
  blockReason:     z.string().max(255).optional(),
  priceOverride:   z.number().min(0).optional(),
  weatherStatus:   z.enum(['unknown', 'ok', 'alert', 'cancelled']).optional(),
  notes:           z.string().optional(),
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getOperatorId(userId: string): Promise<string | null> {
  const { rows } = await pool.query(
    `SELECT id FROM partners WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return rows[0]?.id ?? null;
}

// ─── GET /api/operator/calendar ───────────────────────────────────────────────
// Возвращает доступность слотов по турам оператора за диапазон дат.

export async function GET(request: NextRequest) {
  const authOrResponse = await requireOperator(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  const operatorId = await getOperatorId(authOrResponse.userId);
  if (!operatorId) {
    return NextResponse.json({ success: false, error: 'Профиль оператора не найден' }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const tourId    = searchParams.get('tourId');
  const startDate = searchParams.get('startDate') ?? new Date().toISOString().slice(0, 10);
  const endDate   = searchParams.get('endDate')   ??
    new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10);

  const params: unknown[] = [operatorId, startDate, endDate];
  let sql = `
    SELECT
      ta.id::text,
      ta.operator_tour_id::text                AS tour_id,
      t.title                                  AS tour_name,
      t.max_participants,
      ta.date::text,
      ta.available_slots,
      ta.booked_slots,
      ta.base_price_override,
      ta.weather_status,
      ta.is_cancelled,
      ta.cancellation_reason                   AS block_reason,
      -- Реальные брони за эту дату
      COALESCE((
        SELECT COUNT(*)
        FROM operator_bookings b
        WHERE b.operator_tour_id = ta.operator_tour_id
          AND b.booking_date = ta.date
          AND b.booking_status IN ('confirmed', 'new')
          AND b.deleted_at IS NULL
      ), 0)::int                               AS booked_spots,
      ta.notes
    FROM tour_availability ta
    JOIN operator_tours t ON ta.operator_tour_id = t.id
    WHERE t.operator_id = $1
      AND ta.date >= $2
      AND ta.date <= $3
  `;

  if (tourId) {
    params.push(tourId);
    sql += ` AND ta.operator_tour_id = $${params.length}`;
  }

  sql += ` ORDER BY ta.date ASC, t.title ASC`;

  try {
    const { rows } = await pool.query(sql, params);

    const availability = rows.map(r => ({
      id:              r.id,
      tourId:          r.tour_id,
      tourName:        r.tour_name,
      maxGroupSize:    r.max_participants,
      date:            r.date,
      availableSlots:  r.available_slots,
      bookedSlots:     r.booked_slots,
      bookedSpots:     r.booked_spots,
      remainingSlots:  Math.max(0, r.available_slots - r.booked_spots),
      priceOverride:   r.base_price_override ? Number(r.base_price_override) : null,
      weatherStatus:   r.weather_status,
      isCancelled:     r.is_cancelled,
      blockReason:     r.block_reason,
      notes:           r.notes,
    }));

    return NextResponse.json({ success: true, data: { availability } });
  } catch {
    return NextResponse.json({ success: false, error: 'Ошибка при получении календаря' }, { status: 500 });
  }
}

// ─── POST /api/operator/calendar ──────────────────────────────────────────────
// Устанавливает / обновляет доступность для конкретной даты тура.

export async function POST(request: NextRequest) {
  const authOrResponse = await requireOperator(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  const operatorId = await getOperatorId(authOrResponse.userId);
  if (!operatorId) {
    return NextResponse.json({ success: false, error: 'Профиль оператора не найден' }, { status: 404 });
  }

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ success: false, error: 'Некорректный JSON' }, { status: 400 });
  }

  const parsed = SetAvailabilitySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Некорректные данные' },
      { status: 400 }
    );
  }
  const { tourId, date, availableSlots, isBlocked, blockReason, priceOverride, weatherStatus } = parsed.data;

  // Проверяем владение туром
  const { rows: ownerRows } = await pool.query(
    `SELECT 1 FROM operator_tours WHERE id = $1 AND operator_id = $2 LIMIT 1`,
    [tourId, operatorId]
  );
  if (ownerRows.length === 0) {
    return NextResponse.json({ success: false, error: 'Тур не найден или нет прав' }, { status: 404 });
  }

  try {
    const { rows } = await pool.query(
      `INSERT INTO tour_availability (
         operator_tour_id, date, available_slots,
         is_cancelled, cancellation_reason, base_price_override, weather_status
       ) VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (operator_tour_id, date) DO UPDATE SET
         available_slots     = EXCLUDED.available_slots,
         is_cancelled        = EXCLUDED.is_cancelled,
         cancellation_reason = EXCLUDED.cancellation_reason,
         base_price_override = EXCLUDED.base_price_override,
         weather_status      = EXCLUDED.weather_status,
         updated_at          = NOW()
       RETURNING id::text, operator_tour_id::text AS tour_id, date::text, available_slots, is_cancelled`,
      [
        tourId,
        date,
        availableSlots ?? 0,
        isBlocked ?? false,
        blockReason ?? null,
        priceOverride ?? null,
        weatherStatus ?? 'unknown',
      ]
    );

    return NextResponse.json({ success: true, data: rows[0], message: 'Доступность обновлена' });
  } catch {
    return NextResponse.json({ success: false, error: 'Ошибка при установке доступности' }, { status: 500 });
  }
}
