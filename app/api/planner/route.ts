import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';

const schema = z.object({
  arrival:   z.string().min(1),
  departure: z.string().min(1),
  budget:    z.enum(['100k', '100-250k', '250-400k', '400k+']),
  interests: z.array(z.string()).min(0).max(14),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Неверные параметры' }, { status: 400 });
    }

    const { arrival, departure, interests } = parsed.data;

    // Упрощённо: беру все туры с отправлениями в диапазон дат
    const result = await query<{
      id: string;
      title: string;
      operator_name: string;
      start_date: string;
      end_date: string;
      days: number;
      price: number | null;
      free_slots: number;
    }>(`
      SELECT
        t.id,
        t.title,
        p.name as operator_name,
        dp.start_date,
        dp.end_date,
        (dp.end_date - dp.start_date) as days,
        COALESCE(dp.price_override, t.price) as price,
        (dp.available_slots - COALESCE(dp.booked_slots, 0)) as free_slots
      FROM tours t
      JOIN partners p ON t.operator_id = p.id
      JOIN tour_departures dp ON dp.tour_id = t.id
      WHERE
        t.is_active = true
        AND dp.status = 'active'
        AND dp.start_date >= $1
        AND dp.end_date <= $2
        AND (dp.available_slots - COALESCE(dp.booked_slots, 0)) > 0
      ORDER BY dp.start_date, t.title
      LIMIT 20
    `, [arrival, departure]);

    return NextResponse.json({
      success: true,
      tours: result.rows,
    });
  } catch (err) {
    return NextResponse.json({ success: false, error: 'Ошибка сервера' }, { status: 500 });
  }
}
