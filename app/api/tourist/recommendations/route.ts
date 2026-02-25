/**
 * GET /api/tourist/recommendations
 * Персонализированные рекомендации туров (только для туристов)
 * Кэш 24 часа в PostgreSQL
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getRecommendations,
  getCachedRecommendations,
  saveRecommendationsCache,
} from '@/lib/recommendations/engine';
import { requireRole } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const authResult = await requireRole(request, ['tourist', 'admin']);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult.userId;

    const limit = Math.min(
      parseInt(request.nextUrl.searchParams.get('limit') ?? '6', 10),
      12
    );

    const forceRefresh = request.nextUrl.searchParams.get('refresh') === '1';

    // Проверяем кэш (24ч)
    if (!forceRefresh) {
      const cached = await getCachedRecommendations(userId);
      if (cached) {
        return NextResponse.json({
          success: true,
          data: cached.slice(0, limit),
          meta: { cached: true, count: cached.slice(0, limit).length },
        });
      }
    }

    // Генерируем свежие рекомендации
    const recommendations = await getRecommendations(userId, limit);

    // Сохраняем в кэш
    await saveRecommendationsCache(userId, recommendations);

    return NextResponse.json({
      success: true,
      data: recommendations,
      meta: { cached: false, count: recommendations.length },
    });
  } catch (error) {
    console.error('Recommendations API error:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка получения рекомендаций' },
      { status: 500 }
    );
  }
}
