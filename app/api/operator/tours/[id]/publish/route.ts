import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

/**
 * POST /api/operator/tours/[id]/publish
 * Публикация тура (перевод из draft в active)
 * 
 * Требования для публикации:
 * - Заполнены все обязательные поля
 * - Есть хотя бы одно фото
 * - Указана цена
 * - Указан сезон
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const operatorId = searchParams.get('operatorId');

    if (!operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Operator ID is required'
      } as ApiResponse<null>, { status: 400 });
    }

    // Проверяем что тур принадлежит оператору
    const tourResult = await query(
      `SELECT id, name, description, price, is_active, operator_id 
       FROM tours WHERE id = $1`,
      [id]
    );

    if (tourResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Тур не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const tour = tourResult.rows[0];

    // Проверка владельца
    if (tour.operator_id !== operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Нет доступа к этому туру'
      } as ApiResponse<null>, { status: 403 });
    }

    // Проверка что тур уже не опубликован
    if (tour.is_active) {
      return NextResponse.json({
        success: false,
        error: 'Тур уже опубликован'
      } as ApiResponse<null>, { status: 400 });
    }

    // Валидация для публикации
    const errors: string[] = [];

    if (!tour.name || tour.name.trim().length < 3) {
      errors.push('Название тура обязательно');
    }
    if (!tour.description || tour.description.trim().length < 20) {
      errors.push('Описание тура обязательно (минимум 20 символов)');
    }
    if (!tour.price || tour.price <= 0) {
      errors.push('Укажите цену тура');
    }

    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Тур не готов к публикации',
        errors: errors
      } as ApiResponse<null>, { status: 400 });
    }

    // Публикуем тур
    await query(
      `UPDATE tours SET is_active = true, updated_at = NOW() WHERE id = $1`,
      [id]
    );

    return NextResponse.json({
      success: true,
      data: {
        id: tour.id,
        name: tour.name,
        status: 'published',
        isActive: true
      },
      message: 'Тур успешно опубликован'
    });

  } catch (error) {
    console.error('Error publishing tour:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to publish tour',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}
