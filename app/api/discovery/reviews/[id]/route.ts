/**
 * GET /api/discovery/reviews/[id] - Получить отзыв
 * PUT /api/discovery/reviews/[id] - Обновить отзыв (только автор)
 * DELETE /api/discovery/reviews/[id] - Удалить отзыв (автор или админ)
 * POST /api/discovery/reviews/[id]/approve - Одобрить отзыв (модератор)
 * POST /api/discovery/reviews/[id]/reject - Отклонить отзыв (модератор)
 * POST /api/discovery/reviews/[id]/respond - Ответить на отзыв (оператор)
 */

import { NextRequest, NextResponse } from 'next/server';
import { reviewService } from '@/lib/database';
import {
  ReviewNotFoundError,
  ReviewValidationError,
} from '@/pillars/discovery/lib/review/types';

// ============================================================================
// GET - ПОЛУЧИТЬ ОТЗЫВ
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Получить отзыв
    const review = await reviewService.read(id);

    return NextResponse.json(
      {
        success: true,
        data: review,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`GET /api/discovery/reviews/[id] error:`, error);

    if (error instanceof ReviewNotFoundError) {
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
        error: 'Failed to fetch review',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT - ОБНОВИТЬ ОТЗЫВ (ТОЛЬКО АВТОР)
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

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

    // Получить отзыв для проверки владения
    const review = await reviewService.read(id);

    if (review.userId !== userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          message: 'You can only update your own reviews',
        },
        { status: 403 }
      );
    }

    // Получить тело запроса
    const body = await request.json();

    // Обновить отзыв
    const updatedReview = await reviewService.update(id, body);

    return NextResponse.json(
      {
        success: true,
        data: updatedReview,
        message: 'Review updated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`PUT /api/discovery/reviews/[id] error:`, error);

    if (error instanceof ReviewNotFoundError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not Found',
          message: error.message,
        },
        { status: 404 }
      );
    }

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

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to update review',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - УДАЛИТЬ ОТЗЫВ
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Проверка аутентификации
    const userId = request.headers.get('x-user-id');
    const role = request.headers.get('x-user-role');

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

    // Получить отзыв для проверки владения
    const review = await reviewService.read(id);

    if (review.userId !== userId && role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          message: 'You can only delete your own reviews',
        },
        { status: 403 }
      );
    }

    // Удалить отзыв
    const deleted = await reviewService.delete(id);

    return NextResponse.json(
      {
        success: true,
        data: { deleted },
        message: 'Review deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`DELETE /api/discovery/reviews/[id] error:`, error);

    if (error instanceof ReviewNotFoundError) {
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
        error: 'Failed to delete review',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST - APPROVE/REJECT/RESPOND
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const pathname = request.nextUrl.pathname;

    // Проверка аутентификации
    const userId = request.headers.get('x-user-id');
    const role = request.headers.get('x-user-role');

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

    const body = await request.json();

    // APPROVE
    if (pathname.includes('/approve')) {
      if (role !== 'admin' && role !== 'moderator') {
        return NextResponse.json(
          {
            success: false,
            error: 'Forbidden',
            message: 'Only moderators can approve reviews',
          },
          { status: 403 }
        );
      }

      const approvedReview = await reviewService.approve(id, userId);
      return NextResponse.json(
        {
          success: true,
          data: approvedReview,
          message: 'Review approved successfully',
        },
        { status: 200 }
      );
    }

    // REJECT
    if (pathname.includes('/reject')) {
      if (role !== 'admin' && role !== 'moderator') {
        return NextResponse.json(
          {
            success: false,
            error: 'Forbidden',
            message: 'Only moderators can reject reviews',
          },
          { status: 403 }
        );
      }

      const reason = body.reason || 'No reason provided';
      const rejectedReview = await reviewService.reject(id, userId, reason);
      return NextResponse.json(
        {
          success: true,
          data: rejectedReview,
          message: 'Review rejected successfully',
        },
        { status: 200 }
      );
    }

    // RESPOND
    if (pathname.includes('/respond')) {
      if (role !== 'operator' && role !== 'admin') {
        return NextResponse.json(
          {
            success: false,
            error: 'Forbidden',
            message: 'Only operators can respond to reviews',
          },
          { status: 403 }
        );
      }

      const response = body.response;
      if (!response || response.trim().length === 0) {
        return NextResponse.json(
          {
            success: false,
            error: 'Bad Request',
            message: 'Response text is required',
          },
          { status: 400 }
        );
      }

      const respondedReview = await reviewService.respondToReview(id, userId, response);
      return NextResponse.json(
        {
          success: true,
          data: respondedReview,
          message: 'Response posted successfully',
        },
        { status: 200 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Bad Request',
        message: 'Invalid action',
      },
      { status: 400 }
    );
  } catch (error) {
    console.error(`POST /api/discovery/reviews/[id] error:`, error);

    if (error instanceof ReviewNotFoundError) {
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
        error: 'Failed to process review',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
