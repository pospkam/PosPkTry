import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { verifyReviewOwnership } from '@/lib/auth/guide-helpers';
import { requireRole } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * POST /api/guide/reviews/[id]/reply
 * Reply to a review
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guideOrResponse = await requireRole(request, ['guide', 'admin']);
    if (guideOrResponse instanceof NextResponse) return guideOrResponse;
    const userId = guideOrResponse.userId;

    const { id } = await params;
    const isOwner = await verifyReviewOwnership(userId, id);
    
    if (!isOwner) {
      return NextResponse.json({
        success: false,
        error: 'Отзыв не найден или у вас нет прав'
      } as ApiResponse<null>, { status: 404 });
    }

    const body = await request.json();
    const { reply } = body;

    if (!reply || reply.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Текст ответа не может быть пустым'
      } as ApiResponse<null>, { status: 400 });
    }

    if (reply.length > 1000) {
      return NextResponse.json({
        success: false,
        error: 'Максимальная длина ответа: 1000 символов'
      } as ApiResponse<null>, { status: 400 });
    }

    const result = await query(
      `UPDATE guide_reviews 
       SET guide_reply = $1, guide_reply_at = NOW(), updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [reply, id]
    );

    // Send notification to tourist
    try {
      const review = result.rows[0];
      if (review.tourist_id) {
        await query(
          `INSERT INTO notifications (user_id, type, title, message, data, priority)
           VALUES ($1, 'guide_reply', 'Гид ответил на ваш отзыв', $2, $3, 'medium')`,
          [
            review.tourist_id,
            'Гид ответил на ваш отзыв. Посмотрите ответ.',
            JSON.stringify({
              reviewId: id,
              guideId: review.guide_id
            })
          ]
        );
      }
    } catch (notifError) {
      console.error('Notification error:', notifError);
      // Don't fail the reply if notification fails
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Ответ успешно опубликован'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Reply to review error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при публикации ответа'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * PUT /api/guide/reviews/[id]/reply
 * Update reply to a review
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guideOrResponse = await requireRole(request, ['guide', 'admin']);
    if (guideOrResponse instanceof NextResponse) return guideOrResponse;
    const userId = guideOrResponse.userId;

    const { id } = await params;
    const isOwner = await verifyReviewOwnership(userId, id);
    
    if (!isOwner) {
      return NextResponse.json({
        success: false,
        error: 'Отзыв не найден или у вас нет прав'
      } as ApiResponse<null>, { status: 404 });
    }

    const body = await request.json();
    const { reply } = body;

    if (!reply || reply.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Текст ответа не может быть пустым'
      } as ApiResponse<null>, { status: 400 });
    }

    if (reply.length > 1000) {
      return NextResponse.json({
        success: false,
        error: 'Максимальная длина ответа: 1000 символов'
      } as ApiResponse<null>, { status: 400 });
    }

    const result = await query(
      `UPDATE guide_reviews 
       SET guide_reply = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [reply, id]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Ответ успешно обновлён'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Update reply error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при обновлении ответа'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * DELETE /api/guide/reviews/[id]/reply
 * Delete reply to a review
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const guideOrResponse = await requireRole(request, ['guide', 'admin']);
    if (guideOrResponse instanceof NextResponse) return guideOrResponse;
    const userId = guideOrResponse.userId;

    const { id } = await params;
    const isOwner = await verifyReviewOwnership(userId, id);
    
    if (!isOwner) {
      return NextResponse.json({
        success: false,
        error: 'Отзыв не найден или у вас нет прав'
      } as ApiResponse<null>, { status: 404 });
    }

    await query(
      `UPDATE guide_reviews 
       SET guide_reply = NULL, guide_reply_at = NULL, updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    return NextResponse.json({
      success: true,
      message: 'Ответ удалён'
    } as ApiResponse<null>);

  } catch (error) {
    console.error('Delete reply error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при удалении ответа'
    } as ApiResponse<null>, { status: 500 });
  }
}
