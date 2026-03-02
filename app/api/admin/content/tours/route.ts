import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireAdmin } from '@/lib/auth/middleware';
import { ApiResponse, PaginatedResponse } from '@/types';

export const dynamic = 'force-dynamic';
const ALLOWED_SORT_FIELDS = new Set(['created_at', 'updated_at', 'name', 'price', 'rating', 'review_count', 'is_active']);

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
export async function GET(request: NextRequest) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) {
      return adminOrResponse;
    }
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    
    const status = searchParams.get('status'); // 'active', 'inactive', 'all'
    const search = searchParams.get('search');
    const requestedSortBy = searchParams.get('sortBy') || 'created_at';
    const sortBy = ALLOWED_SORT_FIELDS.has(requestedSortBy) ? requestedSortBy : 'created_at';
    const sortOrder = (searchParams.get('sortOrder') || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

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
      ORDER BY t.${sortBy} ${sortOrder}
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



