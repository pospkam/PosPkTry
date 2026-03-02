/**
 * API endpoint для получения списка размещений
 * GET /api/accommodations
 * 
 * Query параметры:
 * - page: номер страницы (default: 1)
 * - limit: количество на странице (default: 20)
 * - type: тип размещения (hotel, hostel, apartment...)
 * - price_min: минимальная цена
 * - price_max: максимальная цена
 * - rating_min: минимальный рейтинг
 * - amenities: удобства (comma-separated)
 * - location_zone: зона расположения
 * - sort: сортировка (price_asc, price_desc, rating_desc, distance)
 * - search: поиск по названию
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const ACCOMMODATIONS_SORT_SQL = {
  price_asc: 'price_per_night_from ASC',
  price_desc: 'price_per_night_from DESC',
  rating_desc: 'rating DESC, review_count DESC',
  name_asc: 'name ASC',
} as const;

const accommodationsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z.string().trim().min(1).optional(),
  price_min: z.coerce.number().nonnegative().optional(),
  price_max: z.coerce.number().nonnegative().optional(),
  rating_min: z.coerce.number().min(0).max(5).optional(),
  amenities: z.string().trim().min(1).optional(),
  location_zone: z.string().trim().min(1).optional(),
  search: z.string().trim().max(200).optional(),
  sort: z.enum(['price_asc', 'price_desc', 'rating_desc', 'name_asc']).default('rating_desc'),
});

function paramOrUndefined(searchParams: URLSearchParams, key: string): string | undefined {
  const raw = searchParams.get(key);
  if (!raw) {
    return undefined;
  }

  const value = raw.trim();
  return value.length > 0 ? value : undefined;
}

// GET /api/accommodations - Public by design: catalog listing for discovery.
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const parsedQuery = accommodationsQuerySchema.safeParse({
      page: paramOrUndefined(searchParams, 'page'),
      limit: paramOrUndefined(searchParams, 'limit'),
      type: paramOrUndefined(searchParams, 'type'),
      price_min: paramOrUndefined(searchParams, 'price_min'),
      price_max: paramOrUndefined(searchParams, 'price_max'),
      rating_min: paramOrUndefined(searchParams, 'rating_min'),
      amenities: paramOrUndefined(searchParams, 'amenities'),
      location_zone: paramOrUndefined(searchParams, 'location_zone'),
      search: paramOrUndefined(searchParams, 'search'),
      sort: paramOrUndefined(searchParams, 'sort'),
    });

    if (!parsedQuery.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'Некорректные параметры запроса',
          details: parsedQuery.error.flatten(),
        },
        { status: 400 }
      );
    }

    const {
      page,
      limit,
      type,
      price_min: priceMin,
      price_max: priceMax,
      rating_min: ratingMin,
      amenities: amenitiesStr,
      location_zone: locationZone,
      search,
      sort,
    } = parsedQuery.data;

    if (priceMin !== undefined && priceMax !== undefined && priceMin > priceMax) {
      return NextResponse.json(
        {
          success: false,
          error: 'Некорректные параметры запроса',
          details: { price: ['price_min не может быть больше price_max'] },
        },
        { status: 400 }
      );
    }

    const offset = (page - 1) * limit;

    // Строим WHERE условия
    const conditions: string[] = ['is_active = true'];
    const params: unknown[] = [];
    let paramIndex = 1;

    if (type) {
      conditions.push(`type = $${paramIndex++}`);
      params.push(type);
    }

    if (priceMin !== undefined) {
      conditions.push(`price_per_night_from >= $${paramIndex++}`);
      params.push(priceMin);
    }

    if (priceMax !== undefined) {
      conditions.push(`price_per_night_from <= $${paramIndex++}`);
      params.push(priceMax);
    }

    if (ratingMin !== undefined) {
      conditions.push(`rating >= $${paramIndex++}`);
      params.push(ratingMin);
    }

    if (locationZone) {
      conditions.push(`location_zone = $${paramIndex++}`);
      params.push(locationZone);
    }

    if (search) {
      conditions.push(`(name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    // Фильтр по удобствам (amenities)
    if (amenitiesStr) {
      const amenities = amenitiesStr
        .split(',')
        .map(a => a.trim())
        .filter(Boolean)
        .slice(0, 20);
      if (amenities.length > 0) {
        conditions.push(`amenities @> $${paramIndex++}::jsonb`);
        params.push(JSON.stringify(amenities));
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const orderBy = ACCOMMODATIONS_SORT_SQL[sort];

    // Получаем общее количество
    const countResult = await query(
      `SELECT COUNT(*) as total FROM accommodations ${whereClause}`,
      params
    );
    const total = Number.parseInt(countResult.rows[0]?.total || '0', 10);

    // Получаем список объектов
    const accommodationsQuery = `
      SELECT 
        a.id,
        a.name,
        a.type,
        a.description,
        a.short_description,
        a.address,
        a.coordinates,
        a.location_zone,
        a.star_rating,
        a.price_per_night_from,
        a.price_per_night_to,
        a.currency,
        a.amenities,
        a.rating,
        a.review_count,
        a.created_at,
        p.name as partner_name,
        (
          SELECT json_agg(json_build_object('url', ast.url, 'alt', ast.alt))
          FROM accommodation_assets aa
          JOIN assets ast ON aa.asset_id = ast.id
          WHERE aa.accommodation_id = a.id
          LIMIT 5
        ) as images
      FROM accommodations a
      LEFT JOIN partners p ON a.partner_id = p.id
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    
    params.push(limit, offset);
    
    const result = await query(accommodationsQuery, params);
    
    // Форматируем данные
    const accommodations = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      description: row.short_description || row.description?.substring(0, 200),
      address: row.address,
      coordinates: row.coordinates,
      locationZone: row.location_zone,
      starRating: row.star_rating,
      pricePerNight: {
        from: parseFloat(row.price_per_night_from),
        to: row.price_per_night_to ? parseFloat(row.price_per_night_to) : null,
        currency: row.currency,
      },
      amenities: row.amenities || [],
      rating: row.rating ? parseFloat(row.rating) : 0,
      reviewCount: row.review_count || 0,
      partnerName: row.partner_name,
      images: row.images || [],
      createdAt: row.created_at,
    }));
    
    // Метаданные пагинации
    const totalPages = Math.ceil(total / limit);
    
    return NextResponse.json({
      success: true,
      data: {
        accommodations,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNext: page < totalPages,
          hasPrev: page > 1,
        },
        filters: {
          type,
          priceMin: priceMin ?? null,
          priceMax: priceMax ?? null,
          ratingMin: ratingMin ?? null,
          amenities: amenitiesStr,
          locationZone,
          search,
          sort,
        },
      },
    });
    
  } catch (error) {
    console.error('Error fetching accommodations:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Ошибка при получении списка размещений',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}



