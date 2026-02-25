/**
 * POST /api/discovery/tours/[id]/publish - Опубликовать тур
 * POST /api/discovery/tours/[id]/unpublish - Снять тур с публикации
 */

import { NextRequest, NextResponse } from 'next/server';
import { tourService } from '@/lib/database';
import {
  TourNotFoundError,
  TourAlreadyPublishedError,
} from '@/lib/database';
import { requireOperator } from '@/lib/auth/middleware';
import { verifyTourOwnership } from '@/lib/auth/operator-helpers';

// ============================================================================
// POST - ОПУБЛИКОВАТЬ ТУР
// ============================================================================

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authOrResponse = await requireOperator(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  try {
    const { id } = await params;
    const pathname = request.nextUrl.pathname;
    const isPublish = pathname.includes('/publish');

    const isOwner = await verifyTourOwnership(authOrResponse.userId, id);
    if (!isOwner && authOrResponse.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          message: 'You can only manage your own tours',
        },
        { status: 403 }
      );
    }

    // Выполнить действие
    let updatedTour;
    let message;

    if (isPublish) {
      updatedTour = await tourService.publish(id);
      message = 'Tour published successfully';
    } else {
      updatedTour = await tourService.unpublish(id);
      message = 'Tour unpublished successfully';
    }

    return NextResponse.json(
      {
        success: true,
        data: updatedTour,
        message,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('POST /api/discovery/tours/[id]/publish error:', error);

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

    if (error instanceof TourAlreadyPublishedError) {
      return NextResponse.json(
        {
          success: false,
          error: 'Bad Request',
          message: error.message,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: 'Failed to publish tour',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
