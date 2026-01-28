/**
 * GET /api/discovery/search - Расширенный поиск туров
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchService } from '@discovery-pillar/lib/tour/services/SearchService';

export async function GET(request: NextRequest) {
  try {
    // Получить параметры из query
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = (page - 1) * limit;

    // Параметры фильтрации
    const activity = searchParams.get('activity');
    const difficulty = searchParams.get('difficulty');
    const minPrice = searchParams.get('minPrice')
      ? parseInt(searchParams.get('minPrice')!)
      : undefined;
    const maxPrice = searchParams.get('maxPrice')
      ? parseInt(searchParams.get('maxPrice')!)
      : undefined;
    const rating = searchParams.get('rating')
      ? parseFloat(searchParams.get('rating')!)
      : undefined;
    const sortBy = searchParams.get('sortBy') as any || 'rating';

    // Если есть параметр advanced=true, использовать продвинутый поиск с фасетами
    const isAdvanced = searchParams.get('advanced') === 'true';

    if (isAdvanced) {
      // Продвинутый поиск с фасетами
      const result = await searchService.advancedSearch({
        query,
        filters: {
          activity,
          difficulty,
          minPrice,
          maxPrice,
          rating,
        },
        sortBy,
        limit,
        offset,
      });

      return NextResponse.json(
        {
          success: true,
          data: result.tours,
          facets: result.facets,
          pagination: {
            page,
            limit,
            total: result.total,
            totalPages: Math.ceil(result.total / limit),
            hasMore: result.hasMore,
          },
          executionTime: result.executionTime,
        },
        { status: 200 }
      );
    }

    // Базовый поиск
    const result = await searchService.search({
      query,
      filters: {
        activity,
        difficulty,
        minPrice,
        maxPrice,
        rating,
      },
      sortBy,
      limit,
      offset,
    });

    return NextResponse.json(
      {
        success: true,
        data: result.tours,
        pagination: {
          page,
          limit,
          total: result.total,
          totalPages: Math.ceil(result.total / limit),
          hasMore: result.hasMore,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('GET /api/discovery/search error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
