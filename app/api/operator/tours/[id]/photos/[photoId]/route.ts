import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { verifyTourOwnership } from '@/lib/auth/operator-helpers';

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
    const { id, photoId } = await params;
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'operator') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    // Verify ownership
    const isOwner = await verifyTourOwnership(userId, params.id);
    
    if (!isOwner) {
      return NextResponse.json({
        success: false,
        error: 'Тур не найден или у вас нет прав'
      } as ApiResponse<null>, { status: 404 });
    }

    const body = await request.json();
    const { alt } = body;

    // Update asset
    const result = await query(
      `UPDATE assets 
       SET alt = $1
       WHERE id = $2
       RETURNING *`,
      [alt || '', params.photoId]
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
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'operator') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    // Verify ownership
    const isOwner = await verifyTourOwnership(userId, params.id);
    
    if (!isOwner) {
      return NextResponse.json({
        success: false,
        error: 'Тур не найден или у вас нет прав'
      } as ApiResponse<null>, { status: 404 });
    }

    // Remove link between tour and asset
    await query(
      'DELETE FROM tour_assets WHERE tour_id = $1 AND asset_id = $2',
      [params.id, params.photoId]
    );

    // Check if asset is used by other tours
    const usageCheck = await query(
      'SELECT COUNT(*) as count FROM tour_assets WHERE asset_id = $1',
      [params.photoId]
    );

    // If not used anywhere else, delete the asset
    if (parseInt(usageCheck.rows[0].count) === 0) {
      await query('DELETE FROM assets WHERE id = $1', [params.photoId]);
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
