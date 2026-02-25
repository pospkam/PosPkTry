/**
 * GET /api/discovery/tours/[id]/stats - Получить статистику тура
 * GET /api/discovery/tours/[id]/reviews - Получить отзывы на тур
 */

import { NextRequest, NextResponse } from 'next/server';
import { tourService } from '@/lib/database';
import { reviewService } from '@/lib/database';
import { TourNotFoundError } from '@/lib/database';

// ============================================================================
// GET - ПОЛУЧИТЬ СТАТИСТИКУ ТУРА
// ============================================================================

// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const pathname = request.nextUrl.pathname;
    const isStats = pathname.includes('/stats');

    if (isStats) {
      // Получить статистику тура
      const stats = await tourService.getStats(id);

      return NextResponse.json(
        {
          success: true,
          data: stats,
        },
        { status: 200 }
      );
    }

    // Получить отзывы на тур
    if (pathname.includes('/reviews')) {
      const searchParams = request.nextUrl.searchParams;
      const page = parseInt(searchParams.get('page') || '1');
      const limit = Math.min(parseInt(searchParams.get('limit') || '10'), 50);
      const offset = (page - 1) * limit;
      const status = searchParams.get('status') || 'approved';

      // Проверка что тур существует
      await tourService.read(id);

      // Получить отзывы
      const result = await reviewService.search({
        filters: {
          tourId: id,
          status: status as any,
        },
        sortBy: 'newest',
        limit,
        offset,
      });

      // Получить статистику отзывов
      const stats = await reviewService.getStats(id);

      return NextResponse.json(
        {
          success: true,
          data: {
            reviews: result.reviews,
            stats,
            pagination: {
              page,
              limit,
              total: result.total,
              totalPages: Math.ceil(result.total / limit),
              hasMore: result.hasMore,
            },
          },
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
    console.error('GET /api/discovery/tours/[id]/stats error:', error);

    if (error instanceof TourNotFoundError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not Found',
          message: error.message,
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch data',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
