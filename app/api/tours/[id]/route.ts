import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

// GET /api/tours/[id] — публичный, без авторизации
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const result = await query(
      `SELECT
        t.*,
        kr.id          AS route_kr_id,
        kr.title       AS route_title,
        kr.category    AS route_category,
        kr.lat         AS route_lat,
        kr.lng         AS route_lng,
        kr.source_url  AS route_source_url,
        p.id           AS partner_id_val,
        p.name         AS partner_name,
        p.rating       AS partner_rating,
        p.phone        AS partner_phone,
        p.email        AS partner_email
       FROM tours t
       LEFT JOIN kamchatka_routes kr ON t.route_id = kr.id
       LEFT JOIN partners p ON t.operator_id = p.id
       WHERE t.id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Тур не найден' },
        { status: 404 }
      );
    }

    const row = result.rows[0];

    const parseJsonField = (val: unknown): unknown[] => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        try { return JSON.parse(val); } catch { return []; }
      }
      return [];
    };

    const tour = {
      id:               row.id as string,
      name:             (row.title || row.name || '') as string,
      description:      (row.fullDescription || row.description || '') as string,
      shortDescription: (row.description || row.short_description || '') as string,
      category:         (row.category || 'adventure') as string,
      difficulty:       (row.difficulty || 'medium') as 'easy' | 'medium' | 'hard',
      duration:         parseInt(String(row.minDuration || row.duration || 0)),
      price:            parseFloat(String(row.pricePerDay || row.price || 0)),
      currency:         (row.currency || 'RUB') as string,
      season:           parseJsonField(row.season),
      coordinates:      parseJsonField(row.coordinates),
      requirements:     parseJsonField(row.requirements),
      included:         parseJsonField(row.included) as string[],
      notIncluded:      parseJsonField(row.notIncluded || row.not_included) as string[],
      maxGroupSize:     parseInt(String(row.maxGroupSize || row.max_group_size || 20)),
      minGroupSize:     parseInt(String(row.minGroupSize || row.min_group_size || 1)),
      rating:           parseFloat(String(row.rating || 0)),
      reviewCount:      parseInt(String(row.review_count || row.reviewCount || 0)),
      isActive:         (row.is_active ?? true) as boolean,
      images:           parseJsonField(row.images) as string[],
      slug:             (row.slug || '') as string,
      locationName:     (row.locationName || row.location_name || '') as string,
      createdAt:        new Date(row.createdAt || row.created_at || Date.now()),
      updatedAt:        new Date(row.updatedAt || row.updated_at || Date.now()),

      // Маршрут из kamchatka_routes
      routeId: (row.route_id as string | null) ?? null,
      route: row.route_kr_id ? {
        id:        row.route_kr_id as string,
        title:     row.route_title as string,
        category:  row.route_category as string,
        lat:       row.route_lat != null ? parseFloat(row.route_lat as string) : null,
        lng:       row.route_lng != null ? parseFloat(row.route_lng as string) : null,
        sourceUrl: (row.route_source_url as string | null) ?? null,
      } : null,

      // Оператор из partners
      operator: row.partner_id_val ? {
        id:     row.partner_id_val as string,
        name:   (row.partner_name || '') as string,
        rating: parseFloat(String(row.partner_rating || 0)),
        phone:  (row.partner_phone || '') as string,
        email:  (row.partner_email || '') as string,
      } : null,
    };

    return NextResponse.json({ success: true, data: tour });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { success: false, error: 'Ошибка загрузки тура', details: process.env.NODE_ENV === 'development' ? msg : undefined },
      { status: 500 }
    );
  }
}
