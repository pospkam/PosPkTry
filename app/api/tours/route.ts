import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireOperator } from '@/lib/auth/middleware';
import { getOperatorPartnerId } from '@/lib/auth/operator-helpers';
import { TotalRow } from '@/lib/types/db-rows';

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
  season: unknown[];
  coordinates: unknown[];
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
  sourceUrl: string | null;
  sourceName: string | null;
  source: 'tour' | 'route';
}

// Локальные изображения-заглушки по категориям
const CATEGORY_IMAGES: Record<string, string> = {
  vulkani:              '/images/activities/volcanoes.jpg',
  geyzery:              '/images/activities/volcanoes.jpg',
  rybalka:              '/images/activities/fishing.jpg',
  termalnye_istochniki: '/images/activities/hotsprings.jpg',
  dzhip:                '/images/activities/jeep.jpg',
  snegohod:             '/images/activities/snowmobile.jpg',
  morskie_progulki:     '/images/activities/sea.jpg',
  vertoletnye_tury:     '/images/activities/helicopter.jpg',
  trekking:             '/images/gallery/camp-sunset.jpg',
  mountains:            '/images/gallery/stela.jpg',
  rivers:               '/images/bento/khalaktyr.jpg',
  lakes:                '/images/gallery/bay-sunset.jpg',
  medvedi:              '/images/gallery/road-winter.jpg',
  eco:                  '/images/gallery/aurora.jpg',
};

// Slug-маппинг категорий homepage → agent_route_knowledge
const SLUG_TO_ARK: Record<string, string> = {
  vulkani:              'vulkani',
  rybalka:              'rybalka',
  termalnye_istochniki: 'termalnye_istochniki',
  geyzery:              'geyzery',
  snegohod:             'snegohod',
  dzhip:                'dzhip',
  medvedi:              'medvedi',
  trekking:             'trekking',
  morskie_progulki:     'morskie_progulki',
  vertoletnye_tury:     'vertoletnye_tury',
  lakes:                'lakes',
  mountains:            'mountains',
  rivers:               'rivers',
  eco:                  'eco',
  // Canonical → slug
  volcanoes:            'vulkani',
  fishing:              'rybalka',
  thermal:              'termalnye_istochniki',
  geysers:              'geyzery',
  snowmobile:           'snegohod',
  jeep:                 'dzhip',
  wildlife:             'medvedi',
  adventure:            'trekking',
  helicopter:           'vertoletnye_tury',
};

// GET /api/tours — Каталог маршрутов и туров
// Основной источник: agent_route_knowledge (259 маршрутов)
// Дополнительно: tours таблица (опциональная)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    const whereConditions: string[] = [];
    const queryParams: (string | number)[] = [];
    let paramIndex = 1;

    if (category) {
      const arkCategory = SLUG_TO_ARK[category] ?? category;
      whereConditions.push(`ark.category = $${paramIndex}`);
      queryParams.push(arkCategory);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(
        `(ark.title ILIKE $${paramIndex} OR ark.search_text ILIKE $${paramIndex})`
      );
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : '';

    // Основной запрос: agent_route_knowledge
    const routesQuery = `
      SELECT
        ark.id,
        ark.title,
        ark.description,
        ark.category,
        ark.lat,
        ark.lng,
        ark.source_url,
        ark.source_name,
        ark.payload,
        ark.created_at,
        ark.updated_at
      FROM agent_route_knowledge ark
      ${whereClause}
      ORDER BY ark.title ASC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    queryParams.push(limit, offset);

    const result = await query(routesQuery, queryParams);

    // Подсчёт
    const countQuery = `SELECT COUNT(*)::int AS total FROM agent_route_knowledge ark ${whereClause}`;
    const countResult = await query<TotalRow>(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0]?.total ?? '0');

    const tours: TourResponse[] = result.rows.map(row => {
      const payload = (typeof row.payload === 'object' && row.payload !== null)
        ? row.payload as Record<string, unknown>
        : {};

      const price = typeof payload.price === 'number' ? payload.price
        : typeof payload.price_from === 'number' ? payload.price_from
        : 0;

      const duration = typeof payload.duration === 'number' ? payload.duration
        : typeof payload.duration_hours === 'number' ? payload.duration_hours
        : 0;

      const difficulty = typeof payload.difficulty === 'string' ? payload.difficulty : 'medium';
      const rawImages = Array.isArray(payload.images) ? payload.images as string[] : [];
      const images = rawImages.length > 0
        ? rawImages
        : (CATEGORY_IMAGES[row.category as string] ? [CATEGORY_IMAGES[row.category as string]] : []);
      const included = Array.isArray(payload.included) ? payload.included as string[] : [];
      const season = Array.isArray(payload.season) ? payload.season : [];

      return {
        id: row.id as string,
        name: (row.title as string) || '',
        description: (row.description as string) || '',
        shortDescription: ((row.description as string) || '').slice(0, 200),
        category: (row.category as string) || '',
        difficulty: difficulty as string,
        duration,
        price,
        currency: 'RUB',
        season,
        coordinates: (row.lat && row.lng)
          ? [{ lat: parseFloat(row.lat as string), lng: parseFloat(row.lng as string) }]
          : [],
        requirements: [],
        included,
        notIncluded: [],
        maxGroupSize: typeof payload.max_group === 'number' ? payload.max_group : 20,
        minGroupSize: 1,
        rating: typeof payload.rating === 'number' ? payload.rating : 0,
        reviewCount: typeof payload.review_count === 'number' ? payload.review_count : 0,
        isActive: true,
        createdAt: new Date(row.created_at as string || Date.now()),
        updatedAt: new Date(row.updated_at as string || Date.now()),
        sourceUrl: (row.source_url as string | null) ?? null,
        sourceName: (row.source_name as string | null) ?? null,
        source: 'route' as const,
        images,
      };
    });

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
    } as ApiResponse<{ tours: TourResponse[]; pagination: { total: number; limit: number; offset: number; hasMore: boolean } }>);

  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      success: false,
      error: 'Не удалось загрузить туры',
      details: process.env.NODE_ENV === 'development' ? errMsg : undefined,
    } as ApiResponse<null>, { status: 500 });
  }
}

// POST /api/tours — Создание нового тура (protected: operator only)
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
      routeId,
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

    if (!name || !description || !difficulty || !duration || !price) {
      return NextResponse.json({
        success: false,
        error: 'Обязательные поля: name, description, difficulty, duration, price',
      } as ApiResponse<null>, { status: 400 });
    }

    const insertQuery = `
      INSERT INTO tours (
        title, description, short_description, category, difficulty,
        duration, price, currency, season, coordinates,
        requirements, included, not_included,
        max_participants, min_participants, operator_id, guide_id, route_id,
        is_active, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, true, NOW(), NOW()
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
      routeId || null,
    ]);

    return NextResponse.json({
      success: true,
      data: {
        id: result.rows[0].id,
        message: 'Тур создан успешно',
      },
    } as ApiResponse<{ id: string; message: string }>);

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Не удалось создать тур',
    } as ApiResponse<null>, { status: 500 });
  }
}
