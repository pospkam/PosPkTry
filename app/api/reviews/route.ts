import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, Review } from '@/types';
import { query } from '@/lib/database';
import { verifyAuth } from '@/lib/auth';

// GET /api/reviews - Получение отзывов (для тура, оператора и т.д.)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tourId = searchParams.get('tourId');
    const operatorId = searchParams.get('operatorId');
    const limit = parseInt(searchParams.get('limit') || '10');
    const offset = parseInt(searchParams.get('offset') || '0');

    let queryText = `
      SELECT
        r.id,
        r.user_id as "userId",
        r.tour_id as "tourId",
        r.rating,
        r.comment,
        r.is_verified as "isVerified",
        r.created_at as "createdAt",
        r.updated_at as "updatedAt",
        u.name as "userName",
        t.name as "tourName",
        COALESCE(ARRAY_AGG(DISTINCT a.url) FILTER (WHERE a.url IS NOT NULL), '{}') as images
      FROM reviews r
      LEFT JOIN users u ON r.user_id = u.id
      LEFT JOIN tours t ON r.tour_id = t.id
      LEFT JOIN review_assets ra ON r.id = ra.review_id
      LEFT JOIN assets a ON ra.asset_id = a.id
    `;

    const conditions = [];
    const params = [];

    if (tourId) {
      conditions.push(`r.tour_id = $${conditions.length + 1}`);
      params.push(tourId);
    }

    if (operatorId) {
      // Отзывы для оператора - через туры этого оператора
      conditions.push(`t.operator_id = $${conditions.length + 1}`);
      params.push(operatorId);
    }

    if (conditions.length > 0) {
      queryText += ` WHERE ${conditions.join(' AND ')}`;
    }

    queryText += `
      GROUP BY r.id, r.user_id, r.tour_id, r.rating, r.comment, r.is_verified, r.created_at, r.updated_at, u.name, t.name
      ORDER BY r.created_at DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);

    const result = await query<Review & { userName: string; tourName: string; images: string[] }>(queryText, params);

    const reviews: Review[] = result.rows.map(row => ({
      id: row.id,
      userId: row.userId,
      tourId: row.tourId,
      rating: row.rating,
      comment: row.comment,
      images: row.images || [],
      isVerified: row.isVerified,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      data: reviews,
    } as ApiResponse<Review[]>);
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении отзывов' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

// POST /api/reviews - Создание отзыва
export async function POST(request: NextRequest) {
  try {
    const auth = await verifyAuth(request);
    if (!auth.userId) {
      return NextResponse.json(
        { success: false, error: 'Пользователь не авторизован' } as ApiResponse<null>,
        { status: 401 }
      );
    }

    const body = await request.json();
    const { tourId, rating, comment, images = [] } = body;
    const parsedRating = Number(rating);
    const normalizedImages = Array.isArray(images)
      ? images
          .filter((imageId): imageId is string => typeof imageId === 'string' && imageId.length > 0)
          .slice(0, 20)
      : [];

    // Валидация входных данных
    if (!tourId || !Number.isFinite(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return NextResponse.json(
        { success: false, error: 'Неверные данные: tourId обязателен, rating должен быть от 1 до 5' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    if (!Array.isArray(images)) {
      return NextResponse.json(
        { success: false, error: 'Неверные данные: images должен быть массивом идентификаторов' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const userId = auth.userId;

    // Проверяем, что пользователь прошел тур (есть завершенная бронь)
    const bookingCheck = await query(`
      SELECT 1
      FROM bookings
      WHERE user_id = $1 AND tour_id = $2 AND status = 'completed'
      LIMIT 1
    `, [userId, tourId]);

    if (bookingCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Вы не можете оставить отзыв о туре, который не завершили' } as ApiResponse<null>,
        { status: 403 }
      );
    }

    // Проверяем, не оставлял ли уже пользователь отзыв об этом туре
    const existingReview = await query(`
      SELECT id FROM reviews WHERE user_id = $1 AND tour_id = $2
    `, [userId, tourId]);

    if (existingReview.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Вы уже оставляли отзыв об этом туре' } as ApiResponse<null>,
        { status: 409 }
      );
    }

    // Создаем отзыв в транзакции
    const result = await query(`
      INSERT INTO reviews (user_id, tour_id, rating, comment, is_verified)
      VALUES ($1, $2, $3, $4, false)
      RETURNING id, created_at, updated_at
    `, [userId, tourId, parsedRating, comment]);

    const newReview = result.rows[0];

    // Сохраняем изображения, если они есть
    if (normalizedImages.length > 0) {
      for (const imageId of normalizedImages) {
        await query(`
          INSERT INTO review_assets (review_id, asset_id)
          VALUES ($1, $2)
        `, [newReview.id, imageId]);
      }
    }

    // Рейтинг тура обновится автоматически через триггер update_tour_rating()

    return NextResponse.json({
      success: true,
      data: {
        id: newReview.id,
        userId,
        tourId,
        rating: parsedRating,
        comment,
        images: normalizedImages,
        isVerified: false,
        createdAt: newReview.created_at,
        updatedAt: newReview.updated_at,
      },
      message: 'Спасибо за отзыв! Он будет опубликован после модерации.',
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при создании отзыва' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}



