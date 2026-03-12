import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { TourDepartureRow } from '@/lib/types/db-rows';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/tours/[id]/departures
 * Список заездов (дат) для конкретного тура.
 * Публичный эндпоинт — фильтрует по активным заездам в будущем.
 *
 * Query params:
 *   ?status=active|sold_out|cancelled|archived (default: active)
 *   ?includePast=true (default: false)
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'active';
    const includePast = searchParams.get('includePast') === 'true';

    // Валидация статуса
    const validStatuses = ['active', 'sold_out', 'cancelled', 'archived'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Некорректный статус' },
        { status: 400 }
      );
    }

    // Проверяем существование тура
    const tourCheck = await query<{ id: string; name: string; price: string; is_active: boolean }>(
      'SELECT id, name, price, is_active FROM tours WHERE id = $1',
      [id]
    );

    if (tourCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Тур не найден' },
        { status: 404 }
      );
    }

    const tour = tourCheck.rows[0];

    const conditions = ['td.tour_id = $1', 'td.status = $2'];
    const params: (string | number)[] = [id, status];

    if (!includePast) {
      conditions.push('td.start_date >= CURRENT_DATE');
    }

    const sql = `
      SELECT td.*
      FROM tour_departures td
      WHERE ${conditions.join(' AND ')}
      ORDER BY td.start_date ASC
    `;

    const result = await query<TourDepartureRow>(sql, params);

    const departures = result.rows.map(row => ({
      id: row.id,
      tourId: row.tour_id,
      startDate: row.start_date,
      endDate: row.end_date,
      availableSlots: row.available_slots,
      bookedSlots: row.booked_slots,
      spotsLeft: row.available_slots - row.booked_slots,
      price: row.price_override ? parseFloat(row.price_override) : parseFloat(tour.price),
      priceOverride: row.price_override ? parseFloat(row.price_override) : null,
      minGroupSize: row.min_group_size,
      status: row.status,
      notes: row.notes,
    }));

    return NextResponse.json({
      success: true,
      data: {
        tourId: id,
        tourName: tour.name,
        basePrice: parseFloat(tour.price),
        departures,
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Ошибка загрузки заездов', details: process.env.NODE_ENV === 'development' ? msg : undefined },
      { status: 500 }
    );
  }
}

/**
 * POST /api/tours/[id]/departures
 * Создать новый заезд для тура.
 * Требует: admin или operator (владелец тура).
 *
 * Body: { startDate, endDate?, availableSlots?, priceOverride?, minGroupSize?, notes? }
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(request);
  if (authResult instanceof NextResponse) return authResult;

  const user = authResult;
  if (user.role !== 'admin' && user.role !== 'operator') {
    return NextResponse.json(
      { success: false, error: 'Недостаточно прав' },
      { status: 403 }
    );
  }

  try {
    const { id } = await context.params;

    // Проверяем тур + владельца
    const tourCheck = await query<{ id: string; operator_id: string | null }>(
      'SELECT id, operator_id FROM tours WHERE id = $1',
      [id]
    );

    if (tourCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Тур не найден' },
        { status: 404 }
      );
    }

    const tour = tourCheck.rows[0];
    if (user.role === 'operator' && tour.operator_id !== user.userId) {
      return NextResponse.json(
        { success: false, error: 'Вы не являетесь владельцем этого тура' },
        { status: 403 }
      );
    }

    const body = await request.json() as Record<string, unknown>;
    const startDate = body.startDate as string | undefined;

    if (!startDate || typeof startDate !== 'string') {
      return NextResponse.json(
        { success: false, error: 'startDate обязателен' },
        { status: 400 }
      );
    }

    // Валидация даты
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(startDate)) {
      return NextResponse.json(
        { success: false, error: 'startDate должен быть в формате YYYY-MM-DD' },
        { status: 400 }
      );
    }

    const endDate = typeof body.endDate === 'string' && dateRegex.test(body.endDate)
      ? body.endDate
      : null;
    const availableSlots = typeof body.availableSlots === 'number' && body.availableSlots > 0
      ? body.availableSlots
      : 10;
    const priceOverride = typeof body.priceOverride === 'number' && body.priceOverride > 0
      ? body.priceOverride
      : null;
    const minGroupSize = typeof body.minGroupSize === 'number' && body.minGroupSize > 0
      ? body.minGroupSize
      : 5;
    const notes = typeof body.notes === 'string' ? body.notes : null;

    const result = await query<TourDepartureRow>(
      `INSERT INTO tour_departures (tour_id, start_date, end_date, available_slots, price_override, min_group_size, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, startDate, endDate, availableSlots, priceOverride, minGroupSize, notes]
    );

    const row = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        id: row.id,
        tourId: row.tour_id,
        startDate: row.start_date,
        endDate: row.end_date,
        availableSlots: row.available_slots,
        bookedSlots: row.booked_slots,
        priceOverride: row.price_override ? parseFloat(row.price_override) : null,
        minGroupSize: row.min_group_size,
        status: row.status,
        notes: row.notes,
      },
    }, { status: 201 });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';

    // Duplicate key — уже есть заезд на эту дату
    if (msg.includes('unique') || msg.includes('duplicate')) {
      return NextResponse.json(
        { success: false, error: 'Заезд на эту дату уже существует' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { success: false, error: 'Ошибка создания заезда', details: process.env.NODE_ENV === 'development' ? msg : undefined },
      { status: 500 }
    );
  }
}
