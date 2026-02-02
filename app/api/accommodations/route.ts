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

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Параметры пагинации
    const page = parseInt(searchParams.get('page') || '1');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
    const offset = (page - 1) * limit;
    
    // Параметры фильтрации
    const type = searchParams.get('type');
    const priceMin = searchParams.get('price_min');
    const priceMax = searchParams.get('price_max');
    const ratingMin = searchParams.get('rating_min');
    const amenitiesStr = searchParams.get('amenities');
    const locationZone = searchParams.get('location_zone');
    const search = searchParams.get('search');
    const sort = searchParams.get('sort') || 'rating_desc';
    
    // Строим WHERE условия
    const conditions: string[] = ['is_active = true'];
    const params: any[] = [];
    let paramIndex = 1;
    
    if (type) {
      conditions.push(`type = $${paramIndex++}`);
      params.push(type);
    }
    
    if (priceMin) {
      conditions.push(`price_per_night_from >= $${paramIndex++}`);
      params.push(parseFloat(priceMin));
    }
    
    if (priceMax) {
      conditions.push(`price_per_night_from <= $${paramIndex++}`);
      params.push(parseFloat(priceMax));
    }
    
    if (ratingMin) {
      conditions.push(`rating >= $${paramIndex++}`);
      params.push(parseFloat(ratingMin));
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
      const amenities = amenitiesStr.split(',').map(a => a.trim());
      conditions.push(`amenities @> $${paramIndex++}::jsonb`);
      params.push(JSON.stringify(amenities));
    }
    
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    
    // Сортировка
    let orderBy = 'rating DESC, review_count DESC';
    switch (sort) {
      case 'price_asc':
        orderBy = 'price_per_night_from ASC';
        break;
      case 'price_desc':
        orderBy = 'price_per_night_from DESC';
        break;
      case 'rating_desc':
        orderBy = 'rating DESC, review_count DESC';
        break;
      case 'name_asc':
        orderBy = 'name ASC';
        break;
    }
    
    // Получаем общее количество
    const countResult = await query(
      `SELECT COUNT(*) as total FROM accommodations ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0]?.total || '0');
    
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
          priceMin,
          priceMax,
          ratingMin,
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



