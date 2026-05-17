/**
 * POST /api/operator/calendar/bulk-open
 *
 * Массовое открытие слотов для тура на диапазон дат.
 * Поддерживает фильтрацию по дням недели (например, только субботы).
 *
 * Body:
 *   tourId:     number
 *   startDate:  YYYY-MM-DD
 *   endDate:    YYYY-MM-DD
 *   slots:      number (кол-во мест на каждый день)
 *   weekdays?:  number[] (0=пн, 6=вс; пусто = все дни)
 *   priceOverride?: number
 *   skipExisting?:  boolean (не перезаписывать уже открытые даты)
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { requireOperator } from '@/lib/auth/middleware';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const BulkOpenSchema = z.object({
  tourId:        z.coerce.number().int().positive('tourId обязателен'),
  startDate:     z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate:       z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slots:         z.number().int().min(1).max(500),
  weekdays:      z.array(z.number().int().min(0).max(6)).optional(),
  priceOverride: z.number().min(0).optional(),
  skipExisting:  z.boolean().optional().default(false),
});

async function getOperatorId(userId: string): Promise<string | null> {
  const { rows } = await pool.query(
    `SELECT id FROM partners WHERE user_id = $1 LIMIT 1`,
    [userId]
  );
  return rows[0]?.id ?? null;
}

function datesInRange(start: string, end: string, weekdayFilter?: number[]): string[] {
  const result: string[] = [];
  const cur = new Date(start + 'T00:00:00Z');
  const fin = new Date(end   + 'T00:00:00Z');
  if (fin < cur || (fin.getTime() - cur.getTime()) > 366 * 86_400_000) return result;

  while (cur <= fin) {
    // JS getUTCDay(): 0=вс,1=пн,...,6=сб → конвертируем в 0=пн,...,6=вс
    const jsDay    = cur.getUTCDay();
    const weekday  = jsDay === 0 ? 6 : jsDay - 1;
    if (!weekdayFilter || weekdayFilter.length === 0 || weekdayFilter.includes(weekday)) {
      result.push(cur.toISOString().slice(0, 10));
    }
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return result;
}

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

  const parsed = BulkOpenSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: parsed.error.issues[0]?.message ?? 'Некорректные данные' },
      { status: 400 }
    );
  }
  const { tourId, startDate, endDate, slots, weekdays, priceOverride, skipExisting } = parsed.data;

  // Проверяем владение туром
  const { rows: ownerRows } = await pool.query(
    `SELECT 1 FROM operator_tours WHERE id = $1 AND operator_id = $2 AND is_active = true LIMIT 1`,
    [tourId, operatorId]
  );
  if (ownerRows.length === 0) {
    return NextResponse.json({ success: false, error: 'Тур не найден или нет прав' }, { status: 404 });
  }

  const dates = datesInRange(startDate, endDate, weekdays);
  if (dates.length === 0) {
    return NextResponse.json({ success: false, error: 'Нет дат в выбранном диапазоне/фильтре' }, { status: 400 });
  }

  try {
    let datesToInsert = dates;
    let skipped = 0;

    if (skipExisting) {
      // Один запрос — получаем все уже открытые даты в диапазоне
      const { rows: existing } = await pool.query<{ date: string }>(
        `SELECT date::text FROM tour_availability
         WHERE operator_tour_id = $1
           AND date = ANY($2::date[])
           AND is_cancelled = false
           AND available_slots > 0`,
        [tourId, dates],
      );
      const existingSet = new Set(existing.map(r => r.date));
      datesToInsert = dates.filter(d => !existingSet.has(d));
      skipped = dates.length - datesToInsert.length;
    }

    if (datesToInsert.length > 0) {
      // Один batch INSERT для всех дат через UNNEST
      await pool.query(
        `INSERT INTO tour_availability (
           operator_tour_id, date, day_of_week, available_slots, booked_slots,
           base_price_override, is_cancelled, weather_status
         )
         SELECT $1, d::date, EXTRACT(DOW FROM d::date)::int, $2, 0, $3, false, 'unknown'
         FROM UNNEST($4::text[]) AS d
         ON CONFLICT (operator_tour_id, date) DO UPDATE SET
           available_slots     = EXCLUDED.available_slots,
           base_price_override = EXCLUDED.base_price_override,
           is_cancelled        = false,
           updated_at          = NOW()`,
        [tourId, slots, priceOverride ?? null, datesToInsert],
      );
    }

    const opened = datesToInsert.length;
    return NextResponse.json({
      success: true,
      data:    { opened, skipped, total: dates.length },
      message: `Открыто ${opened} дат${skipped > 0 ? `, пропущено ${skipped}` : ''}`,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ошибка';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
