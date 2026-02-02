import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * POST /api/operator/reviews/[id]/reply
 * Reply to a review
 * Note: Need to add operator_reply field to reviews table
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
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

    const body = await request.json();
    const { reply } = body;

    if (!reply || reply.trim().length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Текст ответа не может быть пустым'
      } as ApiResponse<null>, { status: 400 });
    }

    // Check if review exists and belongs to operator's tour
    const checkResult = await query(
      `SELECT r.id, t.operator_id, p.user_id
       FROM reviews r
       JOIN tours t ON r.tour_id = t.id
       JOIN partners p ON t.operator_id = p.id
       WHERE r.id = $1`,
      [params.id]
    );

    if (checkResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Отзыв не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    if (checkResult.rows[0].user_id !== userId) {
      return NextResponse.json({
        success: false,
        error: 'У вас нет прав отвечать на этот отзыв'
      } as ApiResponse<null>, { status: 403 });
    }

    // Add operator_reply column if it doesn't exist (temporary solution)
    // In production, this should be in a migration
    await query(`
      ALTER TABLE reviews 
      ADD COLUMN IF NOT EXISTS operator_reply TEXT,
      ADD COLUMN IF NOT EXISTS operator_reply_at TIMESTAMPTZ
    `);

    // Update review with reply
    const result = await query(
      `UPDATE reviews 
       SET operator_reply = $1, operator_reply_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [reply, params.id]
    );

    // Create notification for review author
    const review = result.rows[0];
    await query(
      `INSERT INTO notifications (user_id, type, title, message, priority)
       VALUES ($1, $2, $3, $4, $5)`,
      [
        review.user_id,
        'review_reply',
        'Получен ответ на ваш отзыв',
        `Оператор ответил на ваш отзыв`,
        'normal'
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Ответ успешно добавлен'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Reply to review error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при добавлении ответа'
    } as ApiResponse<null>, { status: 500 });
  }
}
