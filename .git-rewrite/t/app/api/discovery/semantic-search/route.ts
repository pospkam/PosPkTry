/**
 * GET /api/discovery/semantic-search
 * Семантический поиск маршрутов по естественному языковому запросу.
 *
 * Источник: agent_route_knowledge (259 маршрутов, Камчатка).
 * Модель: Xenova/paraphrase-multilingual-MiniLM-L12-v2 (384 dims, русский).
 * Fallback: PostgreSQL tsvector (русский GIN индекс).
 *
 * Params:
 *   q=string     — запрос ("рыбалка у вулкана", "медведи осень")
 *   limit=number — количество результатов (default: 10, max: 50)
 */

import { NextRequest, NextResponse } from 'next/server';
import { semanticSearch, type SemanticSearchResult } from '@/lib/ai/embeddings';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

/** Fallback: русский полнотекстовый поиск по GIN индексу agent_route_knowledge */
async function tsvectorFallback(
  queryText: string,
  limit: number
): Promise<SemanticSearchResult[]> {
  const result = await query<{
    id: string;
    title: string;
    description: string | null;
    category: string;
    source_url: string | null;
    source_name: string | null;
    lat: string | null;
    lng: string | null;
  }>(
    `SELECT id, title, description, category, source_url, source_name, lat, lng
     FROM agent_route_knowledge
     WHERE to_tsvector('russian', search_text) @@ plainto_tsquery('russian', $1)
     ORDER BY ts_rank(to_tsvector('russian', search_text), plainto_tsquery('russian', $1)) DESC
     LIMIT $2`,
    [queryText, limit]
  );

  return result.rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    sourceUrl: row.source_url,
    sourceName: row.source_name,
    lat: row.lat != null ? parseFloat(row.lat) : null,
    lng: row.lng != null ? parseFloat(row.lng) : null,
    similarity: 0,
  }));
}

// Public: семантический поиск маршрутов, без аутентификации.
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const queryText = sp.get('q')?.trim() ?? '';
  const limit = Math.min(Math.max(parseInt(sp.get('limit') ?? '10', 10), 1), 50);

  if (!queryText) {
    return NextResponse.json(
      { success: false, error: 'Параметр q обязателен' },
      { status: 400 }
    );
  }

  if (queryText.length > 500) {
    return NextResponse.json(
      { success: false, error: 'Запрос слишком длинный (макс. 500 символов)' },
      { status: 400 }
    );
  }

  try {
    const results = await semanticSearch(queryText, limit);

    if (results.length > 0) {
      return NextResponse.json({
        success: true,
        data: results,
        meta: { mode: 'semantic', query: queryText, count: results.length },
      });
    }

    // Fallback: русский tsvector
    const fallbackResults = await tsvectorFallback(queryText, limit);
    return NextResponse.json({
      success: true,
      data: fallbackResults,
      meta: { mode: 'fulltext_fallback', query: queryText, count: fallbackResults.length },
    });
  } catch {
    // If model fails to load — graceful fallback to tsvector
    try {
      const fallbackResults = await tsvectorFallback(queryText, limit);
      return NextResponse.json({
        success: true,
        data: fallbackResults,
        meta: { mode: 'fulltext_fallback', query: queryText, count: fallbackResults.length },
      });
    } catch {
      return NextResponse.json(
        { success: false, error: 'Ошибка поиска. Попробуйте позже.' },
        { status: 500 }
      );
    }
  }
}
