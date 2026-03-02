/**
 * GET /api/discovery/tours/[id] - Получить детали тура
 * PUT /api/discovery/tours/[id] - Обновить тур (только владелец)
 * DELETE /api/discovery/tours/[id] - Удалить тур (только владелец или админ)
 */

import { NextRequest, NextResponse } from 'next/server';
import { tourService } from '@/lib/database';
import {
  TourNotFoundError,
  TourValidationError,
} from '@/lib/database';
import { requireOperator } from '@/lib/auth/middleware';
import { verifyTourOwnership } from '@/lib/auth/operator-helpers';

// ============================================================================
// GET - ПОЛУЧИТЬ ДЕТАЛИ ТУРА
// ============================================================================
// Public: детали тура доступны без аутентификации для просмотра.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Получить тур
    const tour = await tourService.read(id);

    return NextResponse.json(
      {
        success: true,
        data: tour,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`GET /api/discovery/tours/[id] error:`, error);

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
        error: 'Failed to fetch tour',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// PUT - ОБНОВИТЬ ТУР
// ============================================================================

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authOrResponse = await requireOperator(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  try {
    const { id } = await params;

    const isOwner = await verifyTourOwnership(authOrResponse.userId, id);
    if (!isOwner && authOrResponse.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Not Found',
          message: 'Tour not found',
        },
        { status: 404 }
      );
    }

    // Получить тело запроса
    const body = await request.json();

    // Обновить тур
    const updatedTour = await tourService.update(id, body);

    return NextResponse.json(
      {
        success: true,
        data: updatedTour,
        message: 'Tour updated successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`PUT /api/discovery/tours/[id] error:`, error);

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
        error: 'Failed to update tour',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE - УДАЛИТЬ ТУР
// ============================================================================

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authOrResponse = await requireOperator(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  try {
    const { id } = await params;

    const isOwner = await verifyTourOwnership(authOrResponse.userId, id);
    if (!isOwner && authOrResponse.role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Not Found',
          message: 'Tour not found',
        },
        { status: 404 }
      );
    }

    // Удалить тур
    const deleted = await tourService.delete(id);

    return NextResponse.json(
      {
        success: true,
        data: { deleted },
        message: 'Tour deleted successfully',
      },
      { status: 200 }
    );
  } catch (error) {
    console.error(`DELETE /api/discovery/tours/[id] error:`, error);

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
        error: 'Failed to delete tour',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
