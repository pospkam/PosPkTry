/**
 * GET /api/discovery/semantic-search
 * Семантический поиск туров по естественному языковому запросу
 * 
 * Params:
 *   q=string           — запрос (например "тур к вулканам для семьи с детьми")
 *   limit=number       — количество результатов (default: 5, max: 20)
 *   fallback=1         — также выполнить SQL-поиск, если нет векторных результатов
 */

import { NextRequest, NextResponse } from 'next/server';
import { semanticSearch } from '@/lib/ai/embeddings';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

/** Резервный SQL-поиск при недоступности векторного */
async function sqlFallbackSearch(
  queryText: string,
  limit: number
): Promise<import('@/lib/ai/embeddings').SemanticSearchResult[]> {
  const like = `%${queryText}%`;
  const result = await query<{
    id: string;
    title: string;
    description: string;
    price: number;
    difficulty: string;
    duration: number;
    category: string;
    location: string;
    tags: string[];
  }>(
    `SELECT id, title, description, price, difficulty, duration,
            category, location, tags
     FROM tours
     WHERE is_active = true
       AND (
         title ILIKE $1
         OR description ILIKE $1
         OR category ILIKE $1
         OR location ILIKE $1
       )
     ORDER BY rating DESC NULLS LAST, created_at DESC
     LIMIT $2`,
    [like, limit]
  );

  return result.rows.map((row) => ({ ...row, similarity: 0 }));
}

// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function GET(request: NextRequest) {
  try {
    const sp = request.nextUrl.searchParams;
    const queryText = sp.get('q')?.trim() ?? '';
    const limit = Math.min(parseInt(sp.get('limit') ?? '5', 10), 20);
    const withFallback = sp.get('fallback') !== '0';

    if (!queryText) {
      return NextResponse.json(
        { success: false, error: 'Параметр q обязателен' },
        { status: 400 }
      );
    }

    // Семантический поиск
    const results = await semanticSearch(queryText, limit);

    // Если нет результатов и разрешён fallback — используем SQL
    if (results.length === 0 && withFallback) {
      const fallbackResults = await sqlFallbackSearch(queryText, limit);
      return NextResponse.json({
        success: true,
        data: fallbackResults,
        meta: {
          mode: 'sql_fallback',
          query: queryText,
          count: fallbackResults.length,
        },
      });
    }

    return NextResponse.json({
      success: true,
      data: results,
      meta: {
        mode: 'semantic',
        query: queryText,
        count: results.length,
      },
    });
  } catch (error) {
    console.error('Semantic search route error:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка семантического поиска' },
      { status: 500 }
    );
  }
}
