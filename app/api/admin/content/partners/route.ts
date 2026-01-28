import { NextRequest, NextResponse } from 'next/server';
import { query } from '@core-infrastructure/lib/database';
import { Partner, ApiResponse, PaginatedResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/content/partners
 * Получение списка партнёров для верификации
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    
    const category = searchParams.get('category');
    const verified = searchParams.get('verified');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    const whereConditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (category) {
      whereConditions.push(`p.category = $${paramIndex}`);
      queryParams.push(category);
      paramIndex++;
    }

    if (verified !== null && verified !== undefined) {
      whereConditions.push(`p.is_verified = $${paramIndex}`);
      queryParams.push(verified === 'true');
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 
      ? `WHERE ${whereConditions.join(' AND ')}` 
      : '';

    // Подсчёт
    const countQuery = `
      SELECT COUNT(*) as total
      FROM partners p
      ${whereClause}
    `;

    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Получение партнёров
    const partnersQuery = `
      SELECT
        p.id,
        p.name,
        p.category,
        p.description,
        p.contact,
        p.rating,
        p.review_count,
        p.is_verified,
        p.created_at,
        p.updated_at,
        l.url as logo_url
      FROM partners p
      LEFT JOIN assets l ON p.logo_asset_id = l.id
      ${whereClause}
      ORDER BY p.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const partnersResult = await query(partnersQuery, queryParams);

    const partners: Partner[] = partnersResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      category: row.category,
      description: row.description,
      contact: row.contact,
      rating: parseFloat(row.rating) || 0,
      reviewCount: parseInt(row.review_count) || 0,
      isVerified: row.is_verified,
      logo: row.logo_url ? {
        id: 'temp-id',
        url: row.logo_url,
        mimeType: 'image/jpeg',
        sha256: '',
        size: 0,
        createdAt: new Date()
      } : undefined,
      images: [],
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));

    const response: PaginatedResponse<Partner> = {
      data: partners,
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
    } as ApiResponse<PaginatedResponse<Partner>>);

  } catch (error) {
    console.error('Error fetching partners:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch partners',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}



