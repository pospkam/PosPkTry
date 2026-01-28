import { NextRequest, NextResponse } from 'next/server';
import { query } from '@core-infrastructure/lib/database';
import { ApiResponse, PaginatedResponse } from '@/types';
import { OperatorTour } from '@/types/operator';

export const dynamic = 'force-dynamic';

/**
 * GET /api/operator/tours
 * Получение списка туров оператора
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const operatorId = searchParams.get('operatorId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    
    const status = searchParams.get('status'); // 'active', 'inactive', 'all'
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    if (!operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Operator ID is required'
      } as ApiResponse<null>, { status: 400 });
    }

    const whereConditions: string[] = ['t.operator_id = $1'];
    const queryParams: any[] = [operatorId];
    let paramIndex = 2;

    if (status === 'active') {
      whereConditions.push('t.is_active = true');
    } else if (status === 'inactive') {
      whereConditions.push('t.is_active = false');
    }

    if (search) {
      whereConditions.push(`(t.name ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      whereConditions.push(`t.category = $${paramIndex}`);
      queryParams.push(category);
      paramIndex++;
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Подсчёт
    const countQuery = `
      SELECT COUNT(*) as total
      FROM tours t
      ${whereClause}
    `;

    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Получение туров с дополнительной информацией
    const toursQuery = `
      SELECT
        t.id,
        t.name,
        t.description,
        t.category,
        t.difficulty,
        t.duration,
        t.max_group_size,
        t.min_group_size,
        t.price,
        t.currency,
        t.is_active,
        t.rating,
        t.review_count,
        t.created_at,
        t.updated_at,
        COALESCE(COUNT(DISTINCT b.id), 0) as bookings_count,
        COALESCE(SUM(CASE WHEN b.status IN ('confirmed', 'completed') THEN b.total_price ELSE 0 END), 0) as total_revenue,
        ARRAY_AGG(DISTINCT a.url) FILTER (WHERE a.url IS NOT NULL) as images
      FROM tours t
      LEFT JOIN bookings b ON t.id = b.tour_id
      LEFT JOIN tour_images ti ON t.id = ti.tour_id
      LEFT JOIN assets a ON ti.asset_id = a.id
      ${whereClause}
      GROUP BY t.id
      ORDER BY t.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const toursResult = await query(toursQuery, queryParams);

    const tours: OperatorTour[] = toursResult.rows.map(row => ({
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
      includes: [], // TODO: Получить из БД
      excludes: [], // TODO: Получить из БД
      itinerary: [], // TODO: Получить из БД
      schedule: {
        startDate: new Date(),
        endDate: undefined,
        daysOfWeek: undefined,
        timeSlots: undefined
      },
      rating: parseFloat(row.rating) || 0,
      reviewCount: parseInt(row.review_count) || 0,
      bookingsCount: parseInt(row.bookings_count) || 0,
      totalRevenue: parseFloat(row.total_revenue) || 0,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));

    const response: PaginatedResponse<OperatorTour> = {
      data: tours,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };

    return NextResponse.json({
      success: true,
      data: response
    } as ApiResponse<PaginatedResponse<OperatorTour>>);

  } catch (error) {
    console.error('Error fetching operator tours:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch tours',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/operator/tours
 * Создание нового тура
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const operatorId = searchParams.get('operatorId');

    if (!operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Operator ID is required'
      } as ApiResponse<null>, { status: 400 });
    }

    const body = await request.json();

    // Валидация
    if (!body.name || !body.description || !body.price) {
      return NextResponse.json({
        success: false,
        error: 'Name, description, and price are required'
      } as ApiResponse<null>, { status: 400 });
    }

    // Создание тура
    const insertQuery = `
      INSERT INTO tours (
        operator_id,
        name,
        description,
        category,
        difficulty,
        duration,
        max_group_size,
        min_group_size,
        price,
        currency,
        is_active,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING id, name, is_active, created_at
    `;

    const values = [
      operatorId,
      body.name,
      body.description,
      body.category || 'adventure',
      body.difficulty || 'medium',
      body.duration || 4,
      body.maxGroupSize || 15,
      body.minGroupSize || 1,
      body.price,
      body.currency || 'RUB',
      body.isActive !== undefined ? body.isActive : true
    ];

    const result = await query(insertQuery, values);
    const newTour = result.rows[0];

    // TODO: Сохранить includes, excludes, itinerary

    return NextResponse.json({
      success: true,
      data: {
        id: newTour.id,
        name: newTour.name,
        isActive: newTour.is_active,
        createdAt: new Date(newTour.created_at)
      },
      message: 'Tour created successfully'
    });

  } catch (error) {
    console.error('Error creating tour:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create tour',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}



