import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/pillars/core-infrastructure-infrastructure/lib/database';
import { Partner, ApiResponse, PaginatedResponse } from '@/types';

export const dynamic = 'force-dynamic';

// GET /api/partners - Получение списка партнеров
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const category = searchParams.get('category');
    const verified = searchParams.get('verified');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    // Строим WHERE условия
    const whereConditions: string[] = [];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (category) {
      whereConditions.push(`category = $${paramIndex}`);
      queryParams.push(category);
      paramIndex++;
    }

    if (verified !== null) {
      whereConditions.push(`is_verified = $${paramIndex}`);
      queryParams.push(verified === 'true');
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Подсчитываем общее количество
    const countQuery = `
      SELECT COUNT(*) as total
      FROM partners
      ${whereClause}
    `;
    
    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

    // Получаем партнеров с пагинацией
    const offset = (page - 1) * limit;
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
        array_agg(DISTINCT a.url) as images,
        l.url as logo_url
      FROM partners p
      LEFT JOIN partner_assets pa ON p.id = pa.partner_id
      LEFT JOIN assets a ON pa.asset_id = a.id
      LEFT JOIN assets l ON p.logo_asset_id = l.id
      ${whereClause}
      GROUP BY p.id, l.url
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
      rating: row.rating,
      reviewCount: row.review_count,
      isVerified: row.is_verified,
      logo: row.logo_url ? { 
        id: 'temp-id', 
        url: row.logo_url, 
        mimeType: 'image/jpeg', 
        sha256: '', 
        size: 0, 
        createdAt: new Date() 
      } : undefined,
      images: row.images.filter(Boolean).map((url: string) => ({ 
        id: 'temp-id', 
        url, 
        mimeType: 'image/jpeg', 
        sha256: '', 
        size: 0, 
        createdAt: new Date() 
      })),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));

    const response: PaginatedResponse<Partner> = {
      data: partners,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };

    return NextResponse.json({
      success: true,
      data: response,
    } as ApiResponse<PaginatedResponse<Partner>>);

  } catch (error) {
    console.error('Error fetching partners:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch partners',
      message: error instanceof Error ? error.message : 'Unknown error',
    } as ApiResponse<null>, { status: 500 });
  }
}

// POST /api/partners - Создание нового партнера
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Валидация обязательных полей
    const requiredFields = ['name', 'category', 'description', 'contact'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({
          success: false,
          error: `Missing required field: ${field}`,
        } as ApiResponse<null>, { status: 400 });
      }
    }

    // Валидация категории
    const validCategories = ['operator', 'guide', 'transfer', 'stay', 'souvenir', 'gear', 'cars', 'restaurant'];
    if (!validCategories.includes(body.category)) {
      return NextResponse.json({
        success: false,
        error: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
      } as ApiResponse<null>, { status: 400 });
    }

    // Создаем партнера
    const createPartnerQuery = `
      INSERT INTO partners (
        name, category, description, contact, is_verified
      ) VALUES (
        $1, $2, $3, $4, $5
      ) RETURNING id, created_at
    `;

    const partnerParams = [
      body.name,
      body.category,
      body.description,
      JSON.stringify(body.contact),
      body.isVerified || false,
    ];

    const result = await query(createPartnerQuery, partnerParams);
    const partnerId = result.rows[0].id;

    // Если есть логотип, связываем его с партнером
    if (body.logoUrl) {
      await query(
        'UPDATE partners SET logo_asset_id = (SELECT id FROM assets WHERE url = $1) WHERE id = $2',
        [body.logoUrl, partnerId]
      );
    }

    // Если есть изображения, связываем их с партнером
    if (body.images && body.images.length > 0) {
      for (const imageUrl of body.images) {
        await query(
          'INSERT INTO partner_assets (partner_id, asset_id) VALUES ($1, (SELECT id FROM assets WHERE url = $2))',
          [partnerId, imageUrl]
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: { id: partnerId, createdAt: result.rows[0].created_at },
      message: 'Partner created successfully',
    } as ApiResponse<{ id: string; createdAt: Date }>);

  } catch (error) {
    console.error('Error creating partner:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create partner',
      message: error instanceof Error ? error.message : 'Unknown error',
    } as ApiResponse<null>, { status: 500 });
  }
}