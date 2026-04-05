import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
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
  images: string[];
  createdAt: Date;
  updatedAt: Date;
  sourceUrl: string | null;
  sourceName: string | null;
  source: 'tour' | 'route';
}

// Локальные изображения-заглушки по категориям (fallback последнего уровня)
const CATEGORY_IMAGES: Record<string, string> = {
  vulkani:              '/images/bento/mutnovsky.jpg',
  geyzery:              '/images/bento/mutnovsky.jpg',
  rybalka:              '/images/activities/fishing.jpg',
  termalnye_istochniki: '/images/bento/paratunka.jpg',
  medvedi:              '/images/gallery/road-winter.jpg',
  morskie_progulki:     '/images/activities/sea.jpg',
  vertoletnye_tury:     '/images/activities/helicopter.jpg',
  trekking:             '/images/gallery/camp-sunset.jpg',
  snegohod:             '/images/activities/snowmobile.jpg',
  dzhip:                '/images/activities/jeep.jpg',
  ozera:                '/images/gallery/bay-sunset.jpg',
  gory:                 '/images/gallery/stela.jpg',
  reki:                 '/images/bento/khalaktyr.jpg',
  eko:                  '/images/gallery/aurora.jpg',
  kombo:                '/images/activities/volcanoes.jpg',
};

// Маппинг старых английских слагов → русские (для обратной совместимости)
const CATEGORY_ALIAS: Record<string, string> = {
  volcanoes: 'vulkani', fishing: 'rybalka', thermal: 'termalnye_istochniki',
  geysers: 'geyzery', wildlife: 'medvedi', bears: 'medvedi',
  helicopter: 'vertoletnye_tury', snowmobile: 'snegohod', jeep: 'dzhip',
  mountains: 'gory', rivers: 'reki', lakes: 'ozera',
  eco: 'eko', combo: 'kombo', adventure: 'trekking',
};

// GET /api/tours — Каталог туров (из таблицы tours)
// Источник: tours таблица + информация об операторе из partners
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search');
    const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 50);
    const offset = Math.max(parseInt(searchParams.get('offset') || '0'), 0);

    const whereConditions: string[] = ['t.is_active = true'];
    const queryParams: (string | number)[] = [];
    let paramIndex = 1;

    if (category) {
      // Резолвим alias (старые английские слаги → русские)
      const resolved = CATEGORY_ALIAS[category] || category;
      // Ищем и по новому русскому, и по старому английскому слагу
      const reverseAlias = Object.entries(CATEGORY_ALIAS).find(([, v]) => v === resolved)?.[0];
      if (reverseAlias) {
        whereConditions.push(`(t.category = $${paramIndex} OR t.category = $${paramIndex + 1})`);
        queryParams.push(resolved, reverseAlias);
        paramIndex += 2;
      } else {
        whereConditions.push(`t.category = $${paramIndex}`);
        queryParams.push(resolved);
        paramIndex++;
      }
    }

    if (search) {
      whereConditions.push(
        `(t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`
      );
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Строим два варианта запроса: новая схема (post-030) и старая (pre-030)
    const buildSelect = (newSchema: boolean) => `
      SELECT
        t.id,
        ${newSchema ? 't.title AS name' : 't.name'},
        t.description,
        t.short_description,
        t.category,
        t.difficulty,
        t.duration,
        t.price,
        t.currency,
        t.season,
        t.coordinates,
        t.requirements,
        t.included,
        t.not_included,
        ${newSchema ? 't.max_participants, t.min_participants' : 't.max_group_size AS max_participants, t.min_group_size AS min_participants'},
        t.rating,
        ${newSchema ? 't.reviews_count' : 't.review_count AS reviews_count'},
        t.is_active,
        ${newSchema ? 't.images,' : '\'[]\' AS images,'}
        t.created_at,
        t.updated_at,
        p.name as operator_name,
        p.hero_image as partner_hero_image,
        p.gallery as partner_gallery
      FROM tours t
      LEFT JOIN partners p ON t.operator_id = p.id
      ${newSchema ? whereClause : whereClause.replace(/t\.title\s+ILIKE/g, 't.name ILIKE')}
      ORDER BY t.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    // Пробуем новую схему (migration 030 applied), при ошибке — старую
    let result;
    try {
      result = await query(buildSelect(true), queryParams);
    } catch (e) {
      if (e instanceof Error && e.message.includes('does not exist')) {
        result = await query(buildSelect(false), queryParams);
      } else {
        throw e;
      }
    }

    // Подсчёт (аналогично)
    const countBase = (newSchema: boolean) =>
      `SELECT COUNT(*)::int AS total FROM tours t ${newSchema ? whereClause : whereClause.replace(/t\.title\s+ILIKE/g, 't.name ILIKE')}`;
    let countResult;
    try {
      countResult = await query<TotalRow>(countBase(true), queryParams.slice(0, -2));
    } catch {
      countResult = await query<TotalRow>(countBase(false), queryParams.slice(0, -2));
    }
    const total = parseInt(countResult.rows[0]?.total ?? '0');

    const tours: TourResponse[] = result.rows.map(row => {
      const included = Array.isArray(row.included) ? (row.included as string[]) : [];
      const notIncluded = Array.isArray(row.not_included) ? (row.not_included as string[]) : [];
      const season = Array.isArray(row.season) ? row.season : [];
      const coordinates = Array.isArray(row.coordinates) ? row.coordinates : [];

      return {
        id: row.id as string,
        name: (row.name as string) || '',
        description: (row.description as string) || '',
        shortDescription: (row.short_description as string) || '',
        category: (row.category as string) || '',
        difficulty: (row.difficulty as string) || 'medium',
        duration: typeof row.duration === 'number' ? row.duration : 0,
        price: typeof row.price === 'string' ? parseFloat(row.price as string) : (row.price as number),
        currency: (row.currency as string) || 'RUB',
        season,
        coordinates,
        requirements: Array.isArray(row.requirements) ? (row.requirements as string[]) : [],
        included,
        notIncluded,
        maxGroupSize: typeof row.max_participants === 'number' ? row.max_participants : 20,
        minGroupSize: typeof row.min_participants === 'number' ? row.min_participants : 1,
        rating: typeof row.rating === 'string' ? parseFloat(row.rating as string) : (row.rating as number),
        reviewCount: typeof row.reviews_count === 'number' ? row.reviews_count : 0,
        isActive: row.is_active === true,
        images: (() => {
          // 1. Собственные изображения тура
          const parseArr = (v: unknown): string[] => {
            if (Array.isArray(v)) return (v as string[]).filter(s => typeof s === 'string' && s.startsWith('/'));
            if (typeof v === 'string') {
              try { const p = JSON.parse(v) as unknown; return Array.isArray(p) ? (p as string[]).filter(s => typeof s === 'string' && s.startsWith('/')) : []; }
              catch { return []; }
            }
            return [];
          };
          const own = parseArr(row.images);
          if (own.length > 0) return own;
          // 2. Галерея оператора (только полные пути)
          const gallery = parseArr(row.partner_gallery);
          if (gallery.length > 0) return [gallery[0]];
          // 3. Hero-фото оператора
          const hero = typeof row.partner_hero_image === 'string' && (row.partner_hero_image as string).startsWith('/')
            ? row.partner_hero_image as string : null;
          if (hero) return [hero];
          // 4. Категорийный fallback
          const cat = CATEGORY_ALIAS[row.category as string] || (row.category as string);
          return [CATEGORY_IMAGES[cat] || '/images/bento/mutnovsky.jpg'];
        })(),
        createdAt: new Date(row.created_at as string),
        updatedAt: new Date(row.updated_at as string),
        sourceUrl: null,
        sourceName: row.operator_name as string | null,
        source: 'tour' as const,
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
    return NextResponse.json({
      success: true,
      data: {
        tours: [],
        pagination: {
          total: 0,
          limit: 0,
          offset: 0,
          hasMore: false,
        },
      },
      degraded: true,
    } as ApiResponse<{ tours: TourResponse[]; pagination: { total: number; limit: number; offset: number; hasMore: boolean } }>, { status: 200 });
  }
}

// POST /api/tours — Создание нового тура (protected: operator only)
const CreateTourSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  description: z.string().min(1, 'Описание обязательно'),
  shortDescription: z.string().optional(),
  category: z.string().optional(),
  difficulty: z.string().min(1, 'Сложность обязательна'),
  duration: z.coerce.number().positive('Длительность должна быть положительной'),
  price: z.coerce.number().positive('Цена должна быть положительной'),
  currency: z.string().default('RUB'),
  season: z.array(z.string()).optional(),
  coordinates: z.array(z.unknown()).optional(),
  requirements: z.array(z.string()).optional(),
  included: z.array(z.string()).optional(),
  notIncluded: z.array(z.string()).optional(),
  maxGroupSize: z.coerce.number().int().positive().optional(),
  minGroupSize: z.coerce.number().int().positive().optional(),
  operatorId: z.string().optional(),
  guideId: z.string().optional(),
  routeId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  const authResult = await requireOperator(request);
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  try {
    const body = await request.json();
    const parsed = CreateTourSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' } as ApiResponse<null>,
        { status: 400 }
      );
    }
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
    } = parsed.data;

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
