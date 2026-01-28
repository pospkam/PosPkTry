/**
 * GET /api/discovery/tours/[id] - Получить детали тура
 * PUT /api/discovery/tours/[id] - Обновить тур (только владелец)
 * DELETE /api/discovery/tours/[id] - Удалить тур (только владелец или админ)
 */

import { NextRequest, NextResponse } from 'next/server';
import { tourService } from '@/pillars/discovery/lib/tour/services/TourService';
import {
  TourNotFoundError,
  TourValidationError,
} from '@/pillars/discovery/lib/tour/types';

// ============================================================================
// GET - ПОЛУЧИТЬ ДЕТАЛИ ТУРА
// ============================================================================

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

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
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Проверка аутентификации
    const operatorId = request.headers.get('x-operator-id');
    const role = request.headers.get('x-user-role');

    if (!operatorId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Operator ID is required',
        },
        { status: 401 }
      );
    }

    // Получить тур для проверки владения
    const tour = await tourService.read(id);

    if (tour.operatorId !== operatorId && role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          message: 'You can only update your own tours',
        },
        { status: 403 }
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
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    // Проверка аутентификации
    const operatorId = request.headers.get('x-operator-id');
    const role = request.headers.get('x-user-role');

    if (!operatorId) {
      return NextResponse.json(
        {
          success: false,
          error: 'Unauthorized',
          message: 'Operator ID is required',
        },
        { status: 401 }
      );
    }

    // Получить тур для проверки владения
    const tour = await tourService.read(id);

    if (tour.operatorId !== operatorId && role !== 'admin') {
      return NextResponse.json(
        {
          success: false,
          error: 'Forbidden',
          message: 'You can only delete your own tours',
        },
        { status: 403 }
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
