/**
 * GET /api/discovery/tours - Получить список туров
 * POST /api/discovery/tours - Создать новый тур (только для операторов)
 */

import { NextRequest, NextResponse } from 'next/server';
import { tourService } from '@/lib/database';
import {
  TourNotFoundError,
  TourValidationError,
} from '@/lib/database';
import { requireOperator } from '@/lib/auth/middleware';
import { getOperatorPartnerId } from '@/lib/auth/operator-helpers';

// ============================================================================
// GET - ПОЛУЧИТЬ СПИСОК ТУРОВ
// ============================================================================
// Public: каталог туров доступен без аутентификации для просмотра.
export async function GET(request: NextRequest) {
  try {
    // Получить параметры из query
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = (page - 1) * limit;

    // Параметры фильтрации
    const query = searchParams.get('q') || '';
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

    // Выполнить поиск
    const result = await tourService.search({
      query,
      filters: {
        activity,
        difficulty,
        minPrice,
        maxPrice,
        rating,
      },
      sortBy,
      sortOrder: 'desc',
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
    console.error('GET /api/discovery/tours error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch tours',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - СОЗДАТЬ НОВЫЙ ТУР (ТОЛЬКО ДЛЯ ОПЕРАТОРОВ)
// ============================================================================

export async function POST(request: NextRequest) {
  const authOrResponse = await requireOperator(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  try {
    const body = await request.json();
    let operatorId = body.operatorId;

    if (authOrResponse.role !== 'admin') {
      const resolvedOperatorId = await getOperatorPartnerId(authOrResponse.userId);
      if (!resolvedOperatorId) {
        return NextResponse.json(
          {
            success: false,
            error: 'Not Found',
            message: 'Operator profile not found',
          },
          { status: 404 }
        );
      }
      operatorId = resolvedOperatorId;
    } else if (!operatorId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bad Request',
          message: 'operatorId is required for admin',
        },
        { status: 400 }
      );
    }

    const tour = await tourService.create({
      ...body,
      operatorId,
    });

    return NextResponse.json(
      {
        success: true,
        data: tour,
        message: 'Tour created successfully',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/discovery/tours error:', error);

    if (error instanceof TourValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation Error',
          message: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create tour',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
