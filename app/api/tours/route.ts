import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

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
// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
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

    const whereConditions = ['is_active = true'];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (category) {
      whereConditions.push(`category = $${paramIndex}`);
      queryParams.push(category);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (minPrice) {
      whereConditions.push(`price >= $${paramIndex}`);
      queryParams.push(parseInt(minPrice));
      paramIndex++;
    }

    if (maxPrice) {
      whereConditions.push(`price <= $${paramIndex}`);
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
      SELECT 
        id, name, description, short_description, category, difficulty,
        duration, price, currency, season, coordinates, requirements,
        included, not_included, max_group_size, min_group_size,
        rating, review_count, is_active, created_at, updated_at
      FROM tours
      ${whereClause}
      ORDER BY rating DESC NULLS LAST, created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    const result = await query(toursQuery, queryParams);

    const countQuery = `SELECT COUNT(*) as total FROM tours ${whereClause}`;
    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0]?.total || '0');

    const tours: TourResponse[] = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      shortDescription: row.short_description,
      category: row.category,
      difficulty: row.difficulty,
      duration: row.duration,
      price: parseFloat(row.price),
      currency: row.currency,
      season: row.season || [],
      coordinates: row.coordinates || [],
      requirements: row.requirements || [],
      included: row.included || [],
      notIncluded: row.not_included || [],
      maxGroupSize: row.max_group_size,
      minGroupSize: row.min_group_size,
      rating: parseFloat(row.rating) || 0,
      reviewCount: row.review_count || 0,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
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
    console.error('Error fetching tours:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch tours',
      message: error instanceof Error ? error.message : 'Database connection error',
    } as ApiResponse<null>, { status: 500 });
  }
}

// POST /api/tours - Создание нового тура
export async function POST(request: NextRequest) {
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
      operatorId || null,
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