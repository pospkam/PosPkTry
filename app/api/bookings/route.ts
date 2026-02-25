import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, Booking } from '@/types';
import { query } from '@/lib/database';
import { verifyAuth } from '@/lib/auth';

// GET /api/bookings - Получение бронирований пользователя
export async function GET(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json(
        { success: false, error: 'Пользователь не авторизован' } as ApiResponse<null>,
        { status: 401 }
      );
    }
    const userId = auth.userId;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    let queryText = `
      SELECT
        b.id,
        b.user_id as "userId",
        b.tour_id as "tourId",
        b.date,
        b.participants,
        b.total_price as "totalPrice",
        b.status,
        b.payment_status as "paymentStatus",
        b.special_requests as "specialRequests",
        b.created_at as "createdAt",
        b.updated_at as "updatedAt",
        t.name as "tourTitle",
        t.description as "tourDescription",
        t.difficulty as "tourDifficulty",
        t.duration,
        t.price as "tourPrice",
        t.max_group_size as "maxParticipants",
        t.min_group_size as "minParticipants",
        t.rating as "tourRating",
        t.review_count as "reviewsCount",
        p.name as "operatorName",
        p.rating as "operatorRating"
      FROM bookings b
      LEFT JOIN tours t ON b.tour_id = t.id
      LEFT JOIN partners p ON t.operator_id = p.id
      WHERE b.user_id = $1
    `;

    const params = [userId];

    if (status) {
      queryText += ` AND b.status = $2`;
      params.push(status);
    }

    queryText += `
      ORDER BY b.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);

    const result = await query(queryText, params);

    const bookings: Booking[] = result.rows.map(row => ({
      id: row.id,
      userId: row.userId,
      tourId: row.tourId,
      tour: {
        id: row.tourId,
        title: row.tourTitle || 'Неизвестный тур',
        description: row.tourDescription || '',
        activity: 'hiking', // TODO: добавить в БД
        duration: `${row.duration} часов`,
        difficulty: row.tourDifficulty || 'medium',
        priceFrom: parseFloat(row.tourPrice) || 0,
        priceTo: parseFloat(row.tourPrice) || 0,
        maxParticipants: row.maxParticipants || 20,
        minParticipants: row.minParticipants || 1,
        images: [], // TODO: добавить из tour_assets
        rating: parseFloat(row.tourRating) || 0,
        reviewsCount: row.reviewsCount || 0,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        operator: {
          id: row.tourId, // TODO: исправить на operator_id
          name: row.operatorName || 'Неизвестный оператор',
          rating: parseFloat(row.operatorRating) || 0,
          phone: '', // TODO: добавить в БД
          email: '', // TODO: добавить в БД
        },
      },
      date: new Date(row.date),
      participants: row.participants,
      totalPrice: parseFloat(row.totalPrice),
      status: row.status,
      paymentStatus: row.paymentStatus,
      specialRequests: row.specialRequests,
      createdAt: new Date(row.createdAt),
      updatedAt: new Date(row.updatedAt),
    }));

    return NextResponse.json({
      success: true,
      data: bookings,
    } as ApiResponse<Booking[]>);
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении бронирований' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

// POST /api/bookings - Создание нового бронирования
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.isAuthenticated || !auth.userId) {
      return NextResponse.json(
        { success: false, error: 'Пользователь не авторизован' } as ApiResponse<null>,
        { status: 401 }
      );
    }
    const userId = auth.userId;

    const body = await request.json();
    const { tourId, date, participants, specialRequests } = body;

    // Валидация входных данных
    if (!tourId || !date || !participants || participants < 1) {
      return NextResponse.json(
        { success: false, error: 'Неверные данные бронирования' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Проверяем существование тура
    const tourCheck = await query('SELECT id, price, max_group_size FROM tours WHERE id = $1', [tourId]);
    if (tourCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Тур не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const tour = tourCheck.rows[0];
    const totalPrice = tour.price * participants;

    // Проверяем доступность на эту дату
    const availabilityCheck = await query(`
      SELECT COUNT(*) as booked_count
      FROM bookings
      WHERE tour_id = $1 AND date = $2 AND status IN ('pending', 'confirmed')
    `, [tourId, date]);

    const bookedCount = parseInt(availabilityCheck.rows[0].booked_count);
    if (bookedCount + participants > tour.max_group_size) {
      return NextResponse.json(
        { success: false, error: 'Недостаточно мест на выбранную дату' } as ApiResponse<null>,
        { status: 409 }
      );
    }

    // Создаем бронирование в транзакции
    const result = await query(`
      INSERT INTO bookings (user_id, tour_id, date, participants, total_price, special_requests)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, created_at
    `, [userId, tourId, date, participants, totalPrice, specialRequests]);

    const newBooking = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        id: newBooking.id,
        userId,
        tourId,
        date,
        participants,
        totalPrice,
        status: 'pending',
        paymentStatus: 'pending',
        specialRequests,
        createdAt: newBooking.created_at,
      },
      message: 'Бронирование создано. Перейдите к оплате.',
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при создании бронирования' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}



