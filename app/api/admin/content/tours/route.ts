import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse, PaginatedResponse } from '@/types';

export const dynamic = 'force-dynamic';

interface AdminTour {
  id: string;
  name: string;
  description: string;
  difficulty: string;
  duration: number;
  price: number;
  currency: string;
  operatorId: string;
  operatorName: string;
  isActive: boolean;
  rating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * GET /api/admin/content/tours
 * Получение списка всех туров для модерации
 */
// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    
    const status = searchParams.get('status'); // 'active', 'inactive', 'all'
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Строим WHERE условия
    const whereConditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (status === 'active') {
      whereConditions.push(`t.is_active = true`);
    } else if (status === 'inactive') {
      whereConditions.push(`t.is_active = false`);
    }

    if (search) {
      whereConditions.push(`(t.name ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Подсчёт общего количества
    const countQuery = `
      SELECT COUNT(*) as total
      FROM tours t
      ${whereClause}
    `;

    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Получение туров
    const toursQuery = `
      SELECT
        t.id,
        t.name,
        t.description,
        t.difficulty,
        t.duration,
        t.price,
        t.currency,
        t.operator_id,
        t.is_active,
        t.rating,
        t.review_count,
        t.created_at,
        t.updated_at,
        p.name as operator_name
      FROM tours t
      LEFT JOIN partners p ON t.operator_id = p.id
      ${whereClause}
      ORDER BY t.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const toursResult = await query(toursQuery, queryParams);

    const tours: AdminTour[] = toursResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      difficulty: row.difficulty,
      duration: row.duration,
      price: parseFloat(row.price),
      currency: row.currency,
      operatorId: row.operator_id,
      operatorName: row.operator_name || 'Неизвестно',
      isActive: row.is_active,
      rating: parseFloat(row.rating) || 0,
      reviewCount: parseInt(row.review_count) || 0,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));

    const response: PaginatedResponse<AdminTour> = {
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
    } as ApiResponse<PaginatedResponse<AdminTour>>);

  } catch (error) {
    console.error('Error fetching tours:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch tours',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}



