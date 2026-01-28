/**
 * POST /api/discovery/reviews - Создать новый отзыв
 * GET /api/discovery/reviews - Получить список отзывов (для модерации)
 */

import { NextRequest, NextResponse } from 'next/server';
import { reviewService } from '@discovery-pillar/lib/review/services/ReviewService';
import {
  ReviewValidationError,
  DuplicateReviewError,
} from '@discovery-pillar/lib/review/types';

// ============================================================================
// POST - СОЗДАТЬ НОВЫЙ ОТЗЫВ
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Проверка аутентификации
    const userId = request.headers.get('x-user-id');

    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'User ID is required',
        },
        { status: 401 }
      );
    }

    // Получить тело запроса
    const body = await request.json();

    // Создать отзыв
    const review = await reviewService.create({
      ...body,
      userId,
    });

    return NextResponse.json(
      {
        success: true,
        data: review,
        message: 'Review created successfully. It will be reviewed by our moderators.',
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('POST /api/discovery/reviews error:', error);

    if (error instanceof ReviewValidationError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Validation Error',
          message: error.message,
        },
        { status: 400 }
      );
    }

    if (error instanceof DuplicateReviewError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Duplicate Review',
          message: error.message,
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to create review',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// GET - ПОЛУЧИТЬ СПИСОК ОТЗЫВОВ (ДЛЯ МОДЕРАЦИИ)
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Проверка аутентификации и прав модератора
    const role = request.headers.get('x-user-role');

    if (role !== 'admin' && role !== 'moderator') {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          message: 'Only moderators can view pending reviews',
        },
        { status: 403 }
      );
    }

    // Получить параметры из query
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = (page - 1) * limit;
    const status = searchParams.get('status') || 'pending';
    const tourId = searchParams.get('tourId');

    // Получить отзывы
    const result = await reviewService.search({
      filters: {
        status: status as any,
        tourId: tourId || undefined,
      },
      sortBy: 'newest',
      limit,
      offset,
    });

    return NextResponse.json(
      {
        success: true,
        data: result.reviews,
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
    console.error('GET /api/discovery/reviews error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch reviews',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
