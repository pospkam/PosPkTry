import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireOperator } from '@/lib/auth/middleware';
import { getOperatorPartnerId } from '@/lib/auth/operator-helpers';

export const dynamic = 'force-dynamic';

interface TourResponse {
  id: string;
  name: string;
  description: string;
  shortDescription: string;
  category: string;
  difficulty: string;
  duration: number;
  price: number;
  currency: string;
  season: any[];
  coordinates: any[];
  requirements: string[];
  included: string[];
  notIncluded: string[];
  maxGroupSize: number;
  minGroupSize: number;
  rating: number;
  reviewCount: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// GET /api/tours - Получение списка туров
// Public by design: catalog listing for discovery.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const difficulty = searchParams.get('difficulty');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Совместимость со схемами: production (camelCase) и dev (snake_case).
    // Production: title, pricePerDay, minDuration, maxGroupSize, minGroupSize
    // Dev: name, price, duration, max_group_size, min_group_size, is_active
    const whereConditions: string[] = [];
    const queryParams: unknown[] = [];
    let paramIndex = 1;

    if (category) {
      whereConditions.push(`category = $${paramIndex}`);
      queryParams.push(category);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(COALESCE(title, name, '') ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (minPrice) {
      whereConditions.push(`COALESCE("pricePerDay", price) >= $${paramIndex}`);
      queryParams.push(parseInt(minPrice));
      paramIndex++;
    }

    if (maxPrice) {
      whereConditions.push(`COALESCE("pricePerDay", price) <= $${paramIndex}`);
      queryParams.push(parseInt(maxPrice));
      paramIndex++;
    }

    if (difficulty) {
      whereConditions.push(`difficulty = $${paramIndex}`);
      queryParams.push(difficulty);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const toursQuery = `
      SELECT *
      FROM tours
      ${whereClause}
      ORDER BY "createdAt" DESC NULLS LAST, "updatedAt" DESC NULLS LAST
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    const result = await query(toursQuery, queryParams);

    const countQuery = `SELECT COUNT(*) as total FROM tours ${whereClause}`;
    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0]?.total || '0');

    // Маппинг строк: поддержка обеих схем
    const tours: TourResponse[] = result.rows.map(row => ({
      id: row.id,
      name: row.title || row.name || '',
      description: row.fullDescription || row.description || '',
      shortDescription: row.description || row.short_description || '',
      category: row.category || '',
      difficulty: row.difficulty || 'medium',
      duration: row.minDuration || row.duration || 0,
      price: parseFloat(row.pricePerDay || row.price || 0),
      currency: row.currency || 'RUB',
      season: row.season || [],
      coordinates: row.coordinates || [],
      requirements: row.requirements || [],
      included: row.included || [],
      notIncluded: row.notIncluded || row.not_included || [],
      maxGroupSize: row.maxGroupSize || row.max_group_size || 20,
      minGroupSize: row.minGroupSize || row.min_group_size || 1,
      rating: parseFloat(row.rating) || 0,
      reviewCount: row.review_count || row.reviewCount || 0,
      isActive: row.is_active ?? true,
      createdAt: new Date(row.createdAt || row.created_at || Date.now()),
      updatedAt: new Date(row.updatedAt || row.updated_at || Date.now()),
    }));

    return NextResponse.json({
      success: true,
      data: {
        tours,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total,
        },
      },
    } as ApiResponse<{ tours: TourResponse[]; pagination: any }>);

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('[TOURS_GET] Database error:', errMsg, error);
    return NextResponse.json({
      success: false,
      error: 'Не удалось загрузить туры',
      details: process.env.NODE_ENV === 'development' ? errMsg : undefined,
    } as ApiResponse<null>, { status: 500 });
  }
}

// POST /api/tours - Создание нового тура (protected: operator only)
export async function POST(request: NextRequest) {
  const authResult = await requireOperator(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const {
      name,
      description,
      shortDescription,
      category,
      difficulty,
      duration,
      price,
      currency,
      season,
      coordinates,
      requirements,
      included,
      notIncluded,
      maxGroupSize,
      minGroupSize,
      operatorId,
      guideId,
    } = body;

    let effectiveOperatorId = operatorId;
    if (authResult.role !== 'admin') {
      const resolvedOperatorId = await getOperatorPartnerId(authResult.userId);
      if (!resolvedOperatorId) {
        return NextResponse.json({
          success: false,
          error: 'Профиль оператора не найден',
        } as ApiResponse<null>, { status: 404 });
      }
      effectiveOperatorId = resolvedOperatorId;
    }

    if (!effectiveOperatorId) {
      return NextResponse.json({
        success: false,
        error: 'operatorId обязателен для администратора',
      } as ApiResponse<null>, { status: 400 });
    }

    // Валидация обязательных полей
    if (!name || !description || !difficulty || !duration || !price) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: name, description, difficulty, duration, price',
      } as ApiResponse<null>, { status: 400 });
    }

    const insertQuery = `
      INSERT INTO tours (
        name, description, short_description, category, difficulty,
        duration, price, currency, season, coordinates,
        requirements, included, not_included,
        max_group_size, min_group_size, operator_id, guide_id,
        is_active, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, true, NOW(), NOW()
      ) RETURNING id
    `;

    const result = await query(insertQuery, [
      name,
      description,
      shortDescription || description.substring(0, 150) + '...',
      category || 'adventure',
      difficulty,
      duration,
      price,
      currency || 'RUB',
      JSON.stringify(season || []),
      JSON.stringify(coordinates || []),
      JSON.stringify(requirements || []),
      JSON.stringify(included || []),
      JSON.stringify(notIncluded || []),
      maxGroupSize || 20,
      minGroupSize || 1,
      effectiveOperatorId,
      guideId || null,
    ]);

    return NextResponse.json({
      success: true,
      data: {
        id: result.rows[0].id,
        message: 'Tour created successfully',
      },
    } as ApiResponse<{ id: string; message: string }>);

  } catch (error) {
    console.error('Error creating tour:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create tour',
      message: error instanceof Error ? error.message : 'Unknown error',
    } as ApiResponse<null>, { status: 500 });
  }
}