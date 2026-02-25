import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireOperator } from '@/lib/auth/middleware';
import { getOperatorPartnerId } from '@/lib/auth/operator-helpers';

interface TourSchedule {
  id: string;
  tour_id: string;
  tour_name: string;
  start_date: Date;
  end_date: Date;
  price: number;
  available_spots: number;
  booked_spots: number;
  status: 'open' | 'full' | 'cancelled';
  season: string;
}

/**
 * GET /api/operator/tours/schedules
 * Получение расписания туров оператора
 * 
 * На основе fishingkam.ru:
 * - Сезонные цены
 * - Минимальная группа 5 человек
 * - Разные периоды (зима, лето, межсезонье)
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireOperator(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const operatorId = await getOperatorPartnerId(userOrResponse.userId);
    if (!operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Партнёрский профиль оператора не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const tourId = searchParams.get('tourId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let queryText = `
      SELECT 
        ts.id,
        ts.tour_id,
        t.name as tour_name,
        ts.start_date,
        ts.end_date,
        ts.price,
        ts.max_participants as available_spots,
        COALESCE(
          (SELECT COUNT(*) FROM bookings b WHERE b.schedule_id = ts.id AND b.status = 'confirmed'),
          0
        ) as booked_spots,
        ts.status,
        t.season
      FROM tour_availability ts
      JOIN tours t ON ts.tour_id = t.id
      WHERE t.operator_id = $1
    `;
    const values: any[] = [operatorId];
    let paramIndex = 2;

    if (tourId) {
      queryText += ` AND ts.tour_id = $${paramIndex}`;
      values.push(tourId);
      paramIndex++;
    }

    if (startDate) {
      queryText += ` AND ts.start_date >= $${paramIndex}`;
      values.push(startDate);
      paramIndex++;
    }

    if (endDate) {
      queryText += ` AND ts.end_date <= $${paramIndex}`;
      values.push(endDate);
      paramIndex++;
    }

    queryText += ` ORDER BY ts.start_date ASC`;

    const result = await query(queryText, values);

    const schedules: TourSchedule[] = result.rows.map(row => ({
      id: row.id,
      tour_id: row.tour_id,
      tour_name: row.tour_name,
      start_date: row.start_date,
      end_date: row.end_date,
      price: parseFloat(row.price),
      available_spots: row.available_spots - row.booked_spots,
      booked_spots: parseInt(row.booked_spots),
      status: row.available_spots <= row.booked_spots ? 'full' : row.status || 'open',
      season: row.season
    }));

    return NextResponse.json({
      success: true,
      data: { schedules },
      meta: {
        total: schedules.length
      }
    });

  } catch (error) {
    console.error('Error fetching schedules:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch schedules',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/operator/tours/schedules
 * Создание нового расписания тура
 * 
 * Сезонные цены на основе fishingkam.ru:
 * - Зима (15.01-20.03): 18,000-20,000₽
 * - Зима (20.02-18.04): 22,000-25,000₽
 * - Лето (18.06-20.07): 28,000₽
 * - Лето (25.08-30.10): 28,000₽
 * - Осень (30.10-15.11): 25,000₽
 */
export async function POST(request: NextRequest) {
  try {
    const userOrResponse = await requireOperator(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const operatorId = await getOperatorPartnerId(userOrResponse.userId);
    if (!operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Партнёрский профиль оператора не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const body = await request.json();

    // Валидация
    const errors: string[] = [];

    if (!body.tourId) {
      errors.push('ID тура обязателен');
    }
    if (!body.startDate) {
      errors.push('Дата начала обязательна');
    }
    if (!body.endDate) {
      errors.push('Дата окончания обязательна');
    }
    if (!body.price || body.price <= 0) {
      errors.push('Цена должна быть положительной');
    }
    if (!body.maxParticipants || body.maxParticipants < 1) {
      errors.push('Укажите максимальное количество участников');
    }

    // Проверка дат
    if (body.startDate && body.endDate) {
      const start = new Date(body.startDate);
      const end = new Date(body.endDate);
      if (start >= end) {
        errors.push('Дата начала должна быть раньше даты окончания');
      }
      if (start < new Date()) {
        errors.push('Дата начала не может быть в прошлом');
      }
    }

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        errors: errors
      } as ApiResponse<null>, { status: 400 });
    }

    // Проверяем что тур принадлежит оператору
    const tourResult = await query(
      `SELECT id, name, operator_id FROM tours WHERE id = $1`,
      [body.tourId]
    );

    if (tourResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Тур не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    if (tourResult.rows[0].operator_id !== operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Тур не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    // Создаем расписание
    const insertResult = await query(
      `INSERT INTO tour_availability (
        tour_id,
        start_date,
        end_date,
        price,
        max_participants,
        status,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, 'open', NOW(), NOW())
      RETURNING id, start_date, end_date, price, max_participants, status`,
      [body.tourId, body.startDate, body.endDate, body.price, body.maxParticipants]
    );

    const schedule = insertResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        id: schedule.id,
        tour_id: body.tourId,
        tour_name: tourResult.rows[0].name,
        start_date: schedule.start_date,
        end_date: schedule.end_date,
        price: parseFloat(schedule.price),
        available_spots: schedule.max_participants,
        booked_spots: 0,
        status: schedule.status
      },
      message: 'Расписание создано'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating schedule:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create schedule',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}
