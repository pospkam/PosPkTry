/**
 * GET /api/discovery/search/autocomplete - Автодополнение для поиска
 * GET /api/discovery/search/recommended - Рекомендованные туры
 * GET /api/discovery/search/trending - Трендовые туры
 * GET /api/discovery/search/tags - Популярные теги
 * GET /api/discovery/search/similar/[id] - Похожие туры
 */

import { NextRequest, NextResponse } from 'next/server';
import { searchService } from '@/pillars/discovery/lib/tour/services/SearchService';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const pathname = request.nextUrl.pathname;

    // AUTOCOMPLETE
    if (pathname.includes('/autocomplete')) {
      const query = searchParams.get('q') || '';
      const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

      const suggestions = await searchService.autocomplete(query, limit);

      return NextResponse.json(
        {
          success: true,
          data: suggestions,
        },
        { status: 200 }
      );
    }

    // RECOMMENDED
    if (pathname.includes('/recommended')) {
      const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
      const operatorId = searchParams.get('operatorId');

      const tours = await searchService.getRecommended(limit, operatorId || undefined);

      return NextResponse.json(
        {
          success: true,
          data: tours,
        },
        { status: 200 }
      );
    }

    // TRENDING
    if (pathname.includes('/trending')) {
      const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);

      const tours = await searchService.getTrending(limit);

      return NextResponse.json(
        {
          success: true,
          data: tours,
        },
        { status: 200 }
      );
    }

    // TAGS
    if (pathname.includes('/tags')) {
      const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);

      const tags = await searchService.getPopularTags(limit);

      return NextResponse.json(
        {
          success: true,
          data: tags,
        },
        { status: 200 }
      );
    }

    // SIMILAR
    if (pathname.includes('/similar')) {
      const tourId = searchParams.get('tourId');
      const limit = Math.min(parseInt(searchParams.get('limit') || '5'), 20);

      if (!tourId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Bad Request',
            message: 'tourId parameter is required',
          },
          { status: 400 }
        );
      }

      const tours = await searchService.getSimilar(tourId, limit);

      return NextResponse.json(
        {
          success: true,
          data: tours,
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Not Found',
        message: 'Endpoint not found',
      },
      { status: 404 }
    );
  } catch (error) {
    console.error('GET /api/discovery/search/* error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Request failed',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
