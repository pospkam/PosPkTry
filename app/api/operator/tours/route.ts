import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

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
    const partnerResult = await query(
      `SELECT id FROM partners WHERE category = 'operator' 
       AND contact->>'email' = (SELECT email FROM users WHERE id = $1)
       LIMIT 1`,
      [userId]
    );

    if (partnerResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Партнёр не найден. Обратитесь к администратору.'
      } as ApiResponse<null>, { status: 404 });
    }

    const operatorId = partnerResult.rows[0].id;

    // Get tours
    const toursResult = await query(
      `SELECT 
        t.id,
        t.name,
        t.description,
        t.short_description,
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
        array_agg(DISTINCT a.url) as images,
        COUNT(DISTINCT b.id) as bookings_count
       FROM tours t
       LEFT JOIN tour_assets ta ON t.id = ta.tour_id
       LEFT JOIN assets a ON ta.asset_id = a.id
       LEFT JOIN bookings b ON t.id = b.tour_id
       WHERE t.operator_id = $1
       GROUP BY t.id
       ORDER BY t.created_at DESC`,
      [operatorId]
    );

    const tours = toursResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      shortDescription: row.short_description,
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
      images: row.images.filter(Boolean),
      bookingsCount: parseInt(row.bookings_count),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return NextResponse.json({
      success: true,
      data: { tours, operatorId }
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

    // Get operator's partner ID
    const partnerResult = await query(
      `SELECT id FROM partners WHERE category = 'operator' 
       AND contact->>'email' = (SELECT email FROM users WHERE id = $1)
       LIMIT 1`,
      [userId]
    );

    if (partnerResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Партнёр не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const operatorId = partnerResult.rows[0].id;
    const body = await request.json();

    const {
      name,
      description,
      shortDescription,
      difficulty,
      duration,
      price,
      season,
      maxGroupSize,
      minGroupSize,
      requirements,
      included,
      notIncluded
    } = body;

    // Validation
    if (!name || !description || !difficulty || !duration || !price) {
      return NextResponse.json({
        success: false,
        error: 'Заполните все обязательные поля'
      } as ApiResponse<null>, { status: 400 });
    }

    // Create tour
    const result = await query(
      `INSERT INTO tours (
        name, description, short_description, difficulty, duration, price,
        season, max_group_size, min_group_size, operator_id,
        requirements, included, not_included, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, true)
      RETURNING *`,
      [
        name,
        description,
        shortDescription || description.substring(0, 200),
        difficulty,
        duration,
        price,
        JSON.stringify(season || []),
        maxGroupSize || 20,
        minGroupSize || 1,
        operatorId,
        JSON.stringify(requirements || []),
        JSON.stringify(included || []),
        JSON.stringify(notIncluded || [])
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Тур создан успешно'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Create tour error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при создании тура'
    } as ApiResponse<null>, { status: 500 });
  }
}
