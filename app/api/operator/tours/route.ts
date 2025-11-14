import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { getOperatorPartnerId } from '@/lib/auth/operator-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/operator/tours
 * Get operator's tours
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'operator') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    // Get operator's partner ID
    const operatorId = await getOperatorPartnerId(userId);
    
    if (!operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Профиль оператора не найден. Обратитесь к администратору.'
      } as ApiResponse<null>, { status: 404 });
    }

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || 'all';
    const category = searchParams.get('category') || '';
    const offset = (page - 1) * limit;

    // Build query
    let queryStr = `
        SELECT 
          t.id,
          t.name,
          t.description,
          t.short_description,
          t.category,
          t.difficulty,
        t.duration,
        t.price,
        t.currency,
        t.season,
        t.max_group_size,
        t.min_group_size,
        t.rating,
        t.review_count,
        t.is_active,
        t.created_at,
        t.updated_at,
        COALESCE(array_agg(DISTINCT a.url) FILTER (WHERE a.url IS NOT NULL), '{}') as images,
        COUNT(DISTINCT b.id) as bookings_count,
        COALESCE(SUM(CASE WHEN b.payment_status = 'paid' THEN b.total_price ELSE 0 END), 0) as total_revenue
      FROM tours t
      LEFT JOIN tour_assets ta ON t.id = ta.tour_id
      LEFT JOIN assets a ON ta.asset_id = a.id
      LEFT JOIN bookings b ON t.id = b.tour_id
      WHERE t.operator_id = $1
    `;

    const params: any[] = [operatorId];
    let paramIndex = 2;

    // Search filter
    if (search) {
      queryStr += ` AND (t.name ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`;
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Status filter
    if (status !== 'all') {
      queryStr += ` AND t.is_active = $${paramIndex}`;
      params.push(status === 'active');
      paramIndex++;
    }

    // Category filter
    if (category) {
      queryStr += ` AND t.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    queryStr += `
      GROUP BY t.id
      ORDER BY t.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await query(queryStr, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM tours WHERE operator_id = $1`;
    const countParams: any[] = [operatorId];
    let countIndex = 2;

    if (search) {
      countQuery += ` AND (name ILIKE $${countIndex} OR description ILIKE $${countIndex})`;
      countParams.push(`%${search}%`);
      countIndex++;
    }

    if (status !== 'all') {
      countQuery += ` AND is_active = $${countIndex}`;
      countParams.push(status === 'active');
      countIndex++;
    }

    if (category) {
      countQuery += ` AND category = $${countIndex}`;
      countParams.push(category);
    }

    const countResult = await query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

      const tours = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      shortDescription: row.short_description,
        category: row.category || 'adventure',
      difficulty: row.difficulty,
      duration: row.duration,
      price: parseFloat(row.price),
      currency: row.currency,
      season: row.season,
      maxGroupSize: row.max_group_size,
      minGroupSize: row.min_group_size,
      rating: parseFloat(row.rating),
      reviewCount: row.review_count,
      isActive: row.is_active,
      images: row.images,
      bookingsCount: parseInt(row.bookings_count),
      totalRevenue: parseFloat(row.total_revenue),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return NextResponse.json({
      success: true,
      data: {
        data: tours,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get operator tours error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении туров'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/operator/tours
 * Create new tour
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'operator') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    const operatorId = await getOperatorPartnerId(userId);
    
    if (!operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Профиль оператора не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const body = await request.json();

    const {
      name,
      description,
      shortDescription,
      category,
      difficulty,
      duration,
      price,
      currency = 'RUB',
      season,
      maxGroupSize,
      minGroupSize,
      requirements,
      included,
      notIncluded,
      coordinates
    } = body;

    // Validation
    if (!name || !description || !difficulty || !duration || !price) {
      return NextResponse.json({
        success: false,
        error: 'Заполните все обязательные поля: название, описание, сложность, длительность, цена'
      } as ApiResponse<null>, { status: 400 });
    }

    // Create tour
    const result = await query(
      `INSERT INTO tours (
        name, description, short_description, category, difficulty, duration, price, currency,
        season, max_group_size, min_group_size, operator_id,
        requirements, included, not_included, coordinates, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, true)
      RETURNING *`,
      [
        name,
        description,
        shortDescription || description.substring(0, 200),
        category || 'adventure',
        difficulty,
        duration,
        price,
        currency,
        JSON.stringify(season || []),
        maxGroupSize || 20,
        minGroupSize || 1,
        operatorId,
        JSON.stringify(requirements || []),
        JSON.stringify(included || []),
        JSON.stringify(notIncluded || []),
        JSON.stringify(coordinates || [])
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Тур успешно создан'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Create tour error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при создании тура',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}
