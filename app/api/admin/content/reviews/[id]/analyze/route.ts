import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { query } from '@/lib/database';
import { callAIWithModelDirect } from '@/lib/ai/providers';
import { ReviewForAnalysisRow } from '@/lib/types/db-rows';

export const dynamic = 'force-dynamic';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const { id } = await params;

    const result = await query<ReviewForAnalysisRow>(
      `SELECT r.id, r.comment, r.rating, u.name as user_name, t.title as tour_name
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN operator_tours t ON r.tour_id = t.id
       WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Отзыв не найден' }, { status: 404 });
    }

    const review = result.rows[0];

    const messages = [
      {
        role: 'system' as const,
        content: 'Ты модератор туристической платформы. Проанализируй отзыв и определи: 1) тональность (позитивный/нейтральный/негативный), 2) есть ли признаки фейка или спама, 3) нарушает ли правила платформы, 4) рекомендация (одобрить/отклонить/требует проверки). Ответь в формате JSON.',
      },
      {
        role: 'user' as const,
        content: `Отзыв от ${review.user_name || 'аноним'} на тур "${review.tour_name || 'неизвестен'}": рейтинг ${review.rating}/5. Текст: "${review.comment || 'без текста'}"`,
      },
    ];

    const analysis = await callAIWithModelDirect(messages, 'fast');

    return NextResponse.json({
      success: true,
      data: { reviewId: id, analysis },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка анализа отзыва' },
      { status: 500 }
    );
  }
}
