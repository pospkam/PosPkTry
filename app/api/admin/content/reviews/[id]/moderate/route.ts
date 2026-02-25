import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/content/reviews/[id]/moderate
 * Модерация отзыва (одобрение/удаление)
 */
// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const { action } = body; // 'approve' or 'delete'

    if (!action || !['approve', 'delete'].includes(action)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid action. Must be "approve" or "delete"'
      } as ApiResponse<null>, { status: 400 });
    }

    // Проверяем существование
    const checkQuery = 'SELECT id FROM reviews WHERE id = $1';
    const checkResult = await query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Review not found'
      } as ApiResponse<null>, { status: 404 });
    }

    if (action === 'approve') {
      // Одобряем отзыв
      const approveQuery = `
        UPDATE reviews
        SET is_verified = true, updated_at = NOW()
        WHERE id = $1
        RETURNING id, is_verified
      `;

      const result = await query(approveQuery, [id]);

      return NextResponse.json({
        success: true,
        data: {
          id: result.rows[0].id,
          isVerified: result.rows[0].is_verified
        },
        message: 'Review approved successfully'
      });
    } else {
      // Удаляем отзыв
      const deleteQuery = 'DELETE FROM reviews WHERE id = $1';
      await query(deleteQuery, [id]);

      return NextResponse.json({
        success: true,
        message: 'Review deleted successfully'
      });
    }

  } catch (error) {
    console.error('Error moderating review:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to moderate review',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}



