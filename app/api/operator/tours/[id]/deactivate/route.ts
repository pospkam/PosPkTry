import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

/**
 * POST /api/operator/tours/[id]/deactivate
 * Деактивация тура (снятие с публикации)
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
      `SELECT id, name, is_active, operator_id FROM tours WHERE id = $1`,
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

    // Проверка что тур активен
    if (!tour.is_active) {
      return NextResponse.json({
        success: false,
        error: 'Тур уже деактивирован'
      } as ApiResponse<null>, { status: 400 });
    }

    // Деактивируем тур
    await query(
      `UPDATE tours SET is_active = false, updated_at = NOW() WHERE id = $1`,
      [id]
    );

    return NextResponse.json({
      success: true,
      data: {
        id: tour.id,
        name: tour.name,
        status: 'draft',
        isActive: false
      },
      message: 'Тур деактивирован'
    });

  } catch (error) {
    console.error('Error deactivating tour:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to deactivate tour',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}
