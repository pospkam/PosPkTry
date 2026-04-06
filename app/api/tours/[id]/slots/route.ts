/**
 * GET /api/tours/[id]/slots
 * Публичный. Возвращает ближайшие доступные даты из tour_availability для operator_tour_id.
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tourId = parseInt(params.id, 10);
    if (!tourId) return NextResponse.json({ success: false, error: 'Invalid id' }, { status: 400 });

    const { rows } = await pool.query(
      `SELECT
         date::text AS date,
         available_slots,
         booked_slots,
         (available_slots - booked_slots) AS free_slots
       FROM tour_availability
       WHERE operator_tour_id = $1
         AND date >= CURRENT_DATE
         AND is_cancelled = false
         AND (available_slots - booked_slots) > 0
       ORDER BY date ASC
       LIMIT 30`,
      [tourId]
    );

    return NextResponse.json({ success: true, slots: rows });
  } catch {
    return NextResponse.json({ success: false, error: 'Ошибка загрузки дат' }, { status: 500 });
  }
}
