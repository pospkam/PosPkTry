/**
 * POST /api/operator/tours/[id]/generate-tags
 * Генерирует AI-теги для фотографий тура (только для операторов)
 */

import { NextRequest, NextResponse } from 'next/server';
import { tagTourPhotos } from '@/lib/ai/image-tagger';
import { query } from '@/lib/database';
import { requireOperator } from '@/lib/auth/middleware';
import { verifyTourOwnership } from '@/lib/auth/operator-helpers';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const operatorOrResponse = await requireOperator(request);
    if (operatorOrResponse instanceof NextResponse) {
      return operatorOrResponse;
    }
    const userId = operatorOrResponse.userId;
    const userRole = operatorOrResponse.role;

    const tourId = params.id;

    if (userRole !== 'admin') {
      const isOwner = await verifyTourOwnership(userId, tourId);
      if (!isOwner) {
        return NextResponse.json(
          { success: false, error: 'Тур не найден' },
          { status: 404 }
        );
      }
    }

    // Получаем данные тура и проверяем владельца
    const tourResult = await query<{
      id: string;
      title: string;
      photos: string[];
      images: string[];
    }>(
      `SELECT id, title, photos, images FROM tours WHERE id = $1`,
      [tourId]
    );

    if (tourResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Тур не найден' },
        { status: 404 }
      );
    }

    const tour = tourResult.rows[0];

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
    const operatorOrResponse = await requireOperator(request);
    if (operatorOrResponse instanceof NextResponse) {
      return operatorOrResponse;
    }
    const userId = operatorOrResponse.userId;
    const userRole = operatorOrResponse.role;
    const tourId = params.id;

    if (userRole !== 'admin') {
      const isOwner = await verifyTourOwnership(userId, tourId);
      if (!isOwner) {
        return NextResponse.json(
          { success: false, error: 'Тур не найден' },
          { status: 404 }
        );
      }
    }

    const result = await query<{ ai_tags: Record<string, unknown> }>(
      `SELECT ai_tags FROM tours WHERE id = $1`,
      [tourId]
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
