import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/operator/tours/[id]
 * Получение детальной информации о туре
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const operatorId = searchParams.get('operatorId');

    if (!operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Operator ID is required'
      } as ApiResponse<null>, { status: 400 });
    }

    const tourQuery = `
      SELECT
        t.*,
        ARRAY_AGG(DISTINCT a.url) FILTER (WHERE a.url IS NOT NULL) as images,
        COUNT(DISTINCT b.id) as bookings_count,
        SUM(CASE WHEN b.status IN ('confirmed', 'completed') THEN b.total_price ELSE 0 END) as total_revenue
      FROM tours t
      LEFT JOIN tour_images ti ON t.id = ti.tour_id
      LEFT JOIN assets a ON ti.asset_id = a.id
      LEFT JOIN bookings b ON t.id = b.tour_id
      WHERE t.id = $1 AND t.operator_id = $2
      GROUP BY t.id
    `;

    const result = await query(tourQuery, [id, operatorId]);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Tour not found'
      } as ApiResponse<null>, { status: 404 });
    }

    const row = result.rows[0];

    const tour = {
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      difficulty: row.difficulty,
      duration: parseInt(row.duration),
      maxGroupSize: parseInt(row.max_group_size),
      minGroupSize: parseInt(row.min_group_size) || 1,
      price: parseFloat(row.price),
      currency: row.currency,
      isActive: row.is_active,
      images: row.images || [],
      includes: [], // TODO
      excludes: [], // TODO
      itinerary: [], // TODO
      schedule: {
        startDate: new Date(),
        endDate: undefined
      },
      rating: parseFloat(row.rating) || 0,
      reviewCount: parseInt(row.review_count) || 0,
      bookingsCount: parseInt(row.bookings_count) || 0,
      totalRevenue: parseFloat(row.total_revenue) || 0,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };

    return NextResponse.json({
      success: true,
      data: tour
    });

  } catch (error) {
    console.error('Error fetching tour:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch tour',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * PUT /api/operator/tours/[id]
 * Обновление тура
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const operatorId = searchParams.get('operatorId');

    if (!operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Operator ID is required'
      } as ApiResponse<null>, { status: 400 });
    }

    const body = await request.json();

    // Проверка прав доступа
    const checkQuery = 'SELECT id FROM tours WHERE id = $1 AND operator_id = $2';
    const checkResult = await query(checkQuery, [id, operatorId]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Tour not found or access denied'
      } as ApiResponse<null>, { status: 404 });
    }

    // Строим динамический UPDATE
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    if (body.name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(body.name);
      paramIndex++;
    }

    if (body.description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(body.description);
      paramIndex++;
    }

    if (body.category !== undefined) {
      updates.push(`category = $${paramIndex}`);
      values.push(body.category);
      paramIndex++;
    }

    if (body.difficulty !== undefined) {
      updates.push(`difficulty = $${paramIndex}`);
      values.push(body.difficulty);
      paramIndex++;
    }

    if (body.duration !== undefined) {
      updates.push(`duration = $${paramIndex}`);
      values.push(body.duration);
      paramIndex++;
    }

    if (body.maxGroupSize !== undefined) {
      updates.push(`max_group_size = $${paramIndex}`);
      values.push(body.maxGroupSize);
      paramIndex++;
    }

    if (body.minGroupSize !== undefined) {
      updates.push(`min_group_size = $${paramIndex}`);
      values.push(body.minGroupSize);
      paramIndex++;
    }

    if (body.price !== undefined) {
      updates.push(`price = $${paramIndex}`);
      values.push(body.price);
      paramIndex++;
    }

    if (body.currency !== undefined) {
      updates.push(`currency = $${paramIndex}`);
      values.push(body.currency);
      paramIndex++;
    }

    if (body.isActive !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(body.isActive);
      paramIndex++;
    }

    if (updates.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'No fields to update'
      } as ApiResponse<null>, { status: 400 });
    }

    updates.push(`updated_at = NOW()`);
    values.push(id);

    const updateQuery = `
      UPDATE tours
      SET ${updates.join(', ')}
      WHERE id = $${paramIndex}
      RETURNING id, name, is_active, updated_at
    `;

    const result = await query(updateQuery, values);
    const updatedTour = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        id: updatedTour.id,
        name: updatedTour.name,
        isActive: updatedTour.is_active,
        updatedAt: new Date(updatedTour.updated_at)
      },
      message: 'Tour updated successfully'
    });

  } catch (error) {
    console.error('Error updating tour:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update tour',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * DELETE /api/operator/tours/[id]
 * Удаление тура (архивация)
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const { searchParams } = new URL(request.url);
    const operatorId = searchParams.get('operatorId');

    if (!operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Operator ID is required'
      } as ApiResponse<null>, { status: 400 });
    }

    // Проверка прав доступа
    const checkQuery = 'SELECT id FROM tours WHERE id = $1 AND operator_id = $2';
    const checkResult = await query(checkQuery, [id, operatorId]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Tour not found or access denied'
      } as ApiResponse<null>, { status: 404 });
    }

    // Проверка на активные бронирования
    const bookingsCheckQuery = `
      SELECT COUNT(*) as active_bookings
      FROM bookings
      WHERE tour_id = $1 AND status IN ('confirmed', 'pending')
    `;
    const bookingsCheck = await query(bookingsCheckQuery, [id]);
    const activeBookings = parseInt(bookingsCheck.rows[0].active_bookings);

    if (activeBookings > 0) {
      return NextResponse.json({
        success: false,
        error: 'Cannot delete tour with active bookings',
        message: `Tour has ${activeBookings} active booking(s)`
      } as ApiResponse<null>, { status: 400 });
    }

    // Мягкое удаление (деактивация)
    const archiveQuery = `
      UPDATE tours
      SET is_active = false, updated_at = NOW()
      WHERE id = $1
      RETURNING id
    `;

    await query(archiveQuery, [id]);

    return NextResponse.json({
      success: true,
      message: 'Tour archived successfully'
    });

  } catch (error) {
    console.error('Error deleting tour:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete tour',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}



