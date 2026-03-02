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
} from '@/lib/database';
import { requireAuth, requireRole, requireAdmin } from '@/lib/auth/middleware';

// ============================================================================
// GET - ПОЛУЧИТЬ ОТЗЫВ
// ============================================================================
// Public: детали отзыва доступны без аутентификации для просмотра.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

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
  { params }: { params: Promise<{ id: string }> }
) {
  const authOrResponse = await requireAuth(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  try {
    const { id } = await params;

    const review = await reviewService.read(id);
    const authorId = review.userId ?? review.user_id;

    if (authorId !== authOrResponse.userId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Not Found',
          message: 'Review not found',
        },
        { status: 404 }
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
  { params }: { params: Promise<{ id: string }> }
) {
  const authOrResponse = await requireAuth(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  try {
    const { id } = await params;

    const review = await reviewService.read(id);
    const authorId = review.userId ?? review.user_id;

    if (authorId !== authOrResponse.userId && authOrResponse.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Not Found',
          message: 'Review not found',
        },
        { status: 404 }
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
  { params }: { params: Promise<{ id: string }> }
) {
  const authOrResponse = await requireAuth(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  try {
    const { id } = await params;
    const pathname = request.nextUrl.pathname;
    const body = await request.json();

    // APPROVE — admin only (moderator not in global auth roles)
    if (pathname.includes('/approve')) {
      const adminOrResponse = await requireAdmin(request);
      if (adminOrResponse instanceof NextResponse) return adminOrResponse;

      const approvedReview = await reviewService.approve(id, adminOrResponse.userId);
      return NextResponse.json(
        {
          success: true,
          data: approvedReview,
          message: 'Review approved successfully',
        },
        { status: 200 }
      );
    }

    // REJECT — admin only
    if (pathname.includes('/reject')) {
      const adminOrResponse = await requireAdmin(request);
      if (adminOrResponse instanceof NextResponse) return adminOrResponse;

      const reason = body.reason || 'No reason provided';
      const rejectedReview = await reviewService.reject(id, adminOrResponse.userId, reason);
      return NextResponse.json(
        {
          success: true,
          data: rejectedReview,
          message: 'Review rejected successfully',
        },
        { status: 200 }
      );
    }

    // RESPOND — operator or admin
    if (pathname.includes('/respond')) {
      const operatorOrResponse = await requireRole(request, ['operator', 'admin']);
      if (operatorOrResponse instanceof NextResponse) return operatorOrResponse;

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

      const respondedReview = await reviewService.respondToReview(id, operatorOrResponse.userId, response);
      if (!respondedReview) {
        return NextResponse.json(
          {
            success: false,
            error: 'Not Found',
            message: 'Review not found',
          },
          { status: 404 }
        );
      }
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
