/**
 * POST /api/operator/tours/[id]/generate-tags
 * Генерирует AI-теги для фотографий тура (только для операторов)
 */

import { NextRequest, NextResponse } from 'next/server';
import { tagTourPhotos } from '@/lib/ai/image-tagger';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const tourId = params.id;

    // Проверка авторизации оператора
    const userId = request.headers.get('x-user-id');
    const userRole = request.headers.get('x-user-role');

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'Требуется авторизация' },
        { status: 401 }
      );
    }

    if (userRole !== 'operator' && userRole !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Недостаточно прав. Требуется роль оператора' },
        { status: 403 }
      );
    }

    // Получаем данные тура и проверяем владельца
    const tourResult = await query<{
      id: string;
      title: string;
      photos: string[];
      images: string[];
      operator_id: string;
    }>(
      `SELECT id, title, photos, images, operator_id FROM tours WHERE id = $1`,
      [tourId]
    );

    if (tourResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Тур не найден' },
        { status: 404 }
      );
    }

    const tour = tourResult.rows[0];

    // Проверяем что оператор владеет этим туром (admins могут всё)
    if (userRole !== 'admin' && tour.operator_id !== userId) {
      return NextResponse.json(
        { success: false, error: 'Нет доступа к этому туру' },
        { status: 403 }
      );
    }

    // Собираем URL фотографий (photos или images поле)
    const photoUrls: string[] = [
      ...(Array.isArray(tour.photos) ? tour.photos : []),
      ...(Array.isArray(tour.images) ? tour.images : []),
    ].filter((url) => typeof url === 'string' && url.startsWith('http'));

    if (photoUrls.length === 0) {
      return NextResponse.json(
        { success: false, error: 'У тура нет фотографий для анализа' },
        { status: 422 }
      );
    }

    // Генерируем теги
    const tags = await tagTourPhotos(photoUrls);

    // Сохраняем в БД
    await query(
      `UPDATE tours SET ai_tags = $1::jsonb, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify(tags), tourId]
    );

    return NextResponse.json({
      success: true,
      data: {
        tourId,
        tourTitle: tour.title,
        tags,
        photosAnalyzed: Math.min(photoUrls.length, 3),
      },
    });
  } catch (error) {
    console.error('Generate tags error:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка генерации тегов' },
      { status: 500 }
    );
  }
}

/** GET — получить текущие ai_tags тура */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const result = await query<{ ai_tags: Record<string, unknown> }>(
      `SELECT ai_tags FROM tours WHERE id = $1`,
      [params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Тур не найден' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0].ai_tags ?? {},
    });
  } catch (error) {
    console.error('Get tags error:', error);
    return NextResponse.json({ success: false, error: 'Ошибка' }, { status: 500 });
  }
}
