import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireAdmin } from '@/lib/auth/middleware';
import { callAIWithModelDirect } from '@/lib/ai/providers';
import { getModelForAgent } from '@/lib/ai/agent-models';
import type { ChatMessage } from '@/lib/ai/prompts';
import type { ReviewForAnalysisRow } from '@/lib/types/db-rows';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/content/reviews/[id]/analyze
 * AI analysis of a review — sentiment, spam probability, summary
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const { id } = await params;

    // Fetch review with context
    const result = await query<ReviewForAnalysisRow>(
      `SELECT r.id, r.comment, r.rating,
              u.name as user_name, t.name as tour_name
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN tours t ON r.tour_id = t.id
       WHERE r.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Отзыв не найден' },
        { status: 404 }
      );
    }

    const review = result.rows[0];

    // No comment → quick fallback
    if (!review.comment?.trim()) {
      return NextResponse.json({
        success: true,
        data: { sentiment: 'neutral' as const, spamProbability: 0, summary: 'Отзыв без текста' },
      });
    }

    const prompt = `Ты — модератор платформы KamchatourHub. Проанализируй отзыв туриста и верни ТОЛЬКО JSON без пояснений.

Отзыв: "${review.comment}"
Оценка: ${review.rating}/5
Тур: ${review.tour_name ?? 'Неизвестен'}
Пользователь: ${review.user_name ?? 'Аноним'}

Верни JSON:
{"sentiment":"positive"|"negative"|"neutral","spamProbability":число от 0 до 1,"summary":"1-2 предложения на русском"}

Признаки спама: повторы, нерелевантный контент, реклама, набор символов, копипаст.
ТОЛЬКО JSON, без пояснений.`;

    const messages: ChatMessage[] = [
      { role: 'system', content: 'Ты — AI помощник модератора. Отвечай только JSON.', timestamp: Date.now() },
      { role: 'user', content: prompt, timestamp: Date.now() },
    ];

    const aiResponse = await callAIWithModelDirect(messages, getModelForAgent('content'));

    // Parse AI response
    let sentiment: 'positive' | 'negative' | 'neutral' = 'neutral';
    let spamProbability = 0;
    let summary = 'Не удалось проанализировать';

    try {
      // Extract JSON from response (AI might wrap in markdown code blocks)
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]) as {
          sentiment?: string;
          spamProbability?: number;
          summary?: string;
        };
        if (parsed.sentiment === 'positive' || parsed.sentiment === 'negative' || parsed.sentiment === 'neutral') {
          sentiment = parsed.sentiment;
        }
        if (typeof parsed.spamProbability === 'number') {
          spamProbability = Math.max(0, Math.min(1, parsed.spamProbability));
        }
        if (typeof parsed.summary === 'string') {
          summary = parsed.summary;
        }
      }
    } catch {
      // JSON parse failed — use defaults
    }

    return NextResponse.json({
      success: true,
      data: { sentiment, spamProbability, summary },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка AI анализа' },
      { status: 500 }
    );
  }
}
