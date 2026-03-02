import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireOperator } from '@/lib/auth/middleware';
import { getOperatorPartnerId } from '@/lib/auth/operator-helpers';

export const dynamic = 'force-dynamic';

/**
 * PATCH /api/operator/tours/[id]/photos/[photoId]
 * Update photo metadata (alt text, etc)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const operatorOrResponse = await requireOperator(request);
    if (operatorOrResponse instanceof NextResponse) {
      return operatorOrResponse;
    }
    const userId = operatorOrResponse.userId;

    const { id, photoId } = await params;

    // Verify ownership
    const isOwner = await verifyTourOwnership(userId, id);
    
    if (!isOwner) {
      return NextResponse.json({
        success: false,
        error: 'Тур не найден или у вас нет прав'
      } as ApiResponse<null>, { status: 404 });
    }

    const body = await request.json();
    const { alt } = body;

    // Обновляем только фото, которое действительно привязано к этому туру.
    const result = await query(
      `UPDATE assets a
       SET alt = $1
       WHERE a.id = $2
         AND EXISTS (
           SELECT 1
           FROM tour_assets ta
           WHERE ta.tour_id = $3
             AND ta.asset_id = a.id
         )
       RETURNING *`,
      [alt || '', photoId, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Фотография не найдена'
      } as ApiResponse<null>, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Фотография обновлена'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Update photo error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при обновлении фотографии'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * DELETE /api/operator/tours/[id]/photos/[photoId]
 * Delete photo from tour
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; photoId: string }> }
) {
  try {
    const operatorOrResponse = await requireOperator(request);
    if (operatorOrResponse instanceof NextResponse) {
      return operatorOrResponse;
    }
    if (operatorOrResponse.role !== 'operator') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав доступа'
      } as ApiResponse<null>, { status: 403 });
    }
    const operatorId = await getOperatorPartnerId(operatorOrResponse.userId);
    if (!operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Партнёрский профиль оператора не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const { id, photoId } = await params;

    // Удаляем связь только если фото действительно принадлежит этому туру.
    const unlinkResult = await query(
      `DELETE FROM tour_assets ta
       USING tours t
       WHERE ta.tour_id = t.id
         AND ta.tour_id = $1
         AND ta.asset_id = $2
         AND t.operator_id = $3
       RETURNING ta.asset_id`,
      [id, photoId, operatorId]
    );

    if (unlinkResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Фотография не найдена'
      } as ApiResponse<null>, { status: 404 });
    }

    // Check if asset is used by other tours
    const usageCheck = await query(
      'SELECT COUNT(*) as count FROM tour_assets WHERE asset_id = $1',
      [photoId]
    );

    // If not used anywhere else, delete the asset
    if (parseInt(usageCheck.rows[0].count) === 0) {
      await query('DELETE FROM assets WHERE id = $1', [photoId]);
    }

    return NextResponse.json({
      success: true,
      message: 'Фотография успешно удалена'
    } as ApiResponse<null>);

  } catch (error) {
    console.error('Delete photo error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при удалении фотографии'
    } as ApiResponse<null>, { status: 500 });
  }
}
