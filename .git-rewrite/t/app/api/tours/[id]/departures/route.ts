import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

// GET /api/tours/[id]/departures — публичный, без авторизации
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await query(
      `SELECT
         td.id,
         td.start_date,
         td.end_date,
         td.available_slots - td.booked_slots AS free_slots,
         td.available_slots,
         td.booked_slots,
         COALESCE(td.price_override, t.price) AS price,
         td.notes
       FROM tour_departures td
       JOIN tours t ON t.id = td.tour_id
       WHERE td.tour_id = $1
         AND td.status = 'active'
         AND td.available_slots > td.booked_slots
         AND td.start_date >= CURRENT_DATE
       ORDER BY td.start_date ASC
       LIMIT 20`,
      [id]
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch {
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении дат заездов' },
      { status: 500 }
    );
  }
}
