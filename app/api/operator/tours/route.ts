import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse, PaginatedResponse } from '@/types';
import { OperatorTour } from '@/types/operator';
import { requireOperator } from '@/lib/auth/middleware';
import { getOperatorPartnerId } from '@/lib/auth/operator-helpers';
import { OpTourListRow, OpTourCreateRow, CountRow } from '@/lib/types/db-rows';
import { z } from 'zod';
import { emitEvent, AGENT_EVENTS } from '@/lib/events/emit';

export const dynamic = 'force-dynamic';

const ALLOWED_SORT_FIELDS = new Set([
  'created_at',
  'updated_at',
  'name',
  'price',
  'rating',
  'review_count',
]);

/**
 * Получение списка туров оператора (Kamchatour Hub)
 * @route GET /api/operator/tours
 * @param {NextRequest} request - HTTP-запрос (ожидает JWT)
 * @returns {Promise<NextResponse>} JSON с пагинированным списком туров
 * @throws 401 если неавторизован, 404 если нет профиля, 500 при ошибке БД
 * @security
 * - Все SQL-запросы строго параметризованы ($1, $2, ...)
 * - Поля сортировки whitelisted (ALLOWED_SORT_FIELDS)
 * - WHERE-условия строятся только из разрешённых параметров
 * @example
 * // GET /api/operator/tours?page=1&limit=20&status=active
 * // Response: { success: true, data: { data: [...], pagination: {...} } }
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireOperator(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const operatorId = await getOperatorPartnerId(userOrResponse.userId);
    if (!operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Партнёрский профиль оператора не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    
    const status = searchParams.get('status'); // 'active', 'inactive', 'all'
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const requestedSortBy = searchParams.get('sortBy') || 'created_at';
    const sortBy = ALLOWED_SORT_FIELDS.has(requestedSortBy) ? requestedSortBy : 'created_at';
    const sortOrder = (searchParams.get('sortOrder') || 'desc').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

    const whereConditions: string[] = ['t.operator_id = $1'];
    const queryParams: (string | number | boolean | null)[] = [operatorId];
    let paramIndex = 2;

    if (status === 'active') {
      whereConditions.push('t.is_active = true');
    } else if (status === 'inactive') {
      whereConditions.push('t.is_active = false');
    }

    if (search) {
      whereConditions.push(`(t.name ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (category) {
      whereConditions.push(`t.category = $${paramIndex}`);
      queryParams.push(category);
      paramIndex++;
    }

    const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

    // Подсчёт
    const countQuery = `
      SELECT COUNT(*) as count
      FROM tours t
      ${whereClause}
    `;

    const countResult = await query<CountRow>(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].count);

    // Получение туров с дополнительной информацией
    const toursQuery = `
      SELECT
        t.id,
        t.name,
        t.description,
        t.category,
        t.difficulty,
        t.duration,
        t.max_group_size,
        t.min_group_size,
        t.price,
        t.currency,
        t.is_active,
        t.rating,
        t.review_count,
        t.created_at,
        t.updated_at,
        t.route_id,
        COALESCE(t.includes, '{}')   AS includes,
        COALESCE(t.excludes, '{}')   AS excludes,
        COALESCE(t.itinerary, '[]')  AS itinerary,
        kr.title     AS route_title,
        kr.category  AS route_category,
        kr.lat       AS route_lat,
        kr.lng       AS route_lng,
        COALESCE(COUNT(DISTINCT b.id), 0) as bookings_count,
        COALESCE(SUM(CASE WHEN b.status IN ('confirmed', 'completed') THEN b.total_price ELSE 0 END), 0) as total_revenue,
        ARRAY_AGG(DISTINCT a.url) FILTER (WHERE a.url IS NOT NULL) as images
      FROM tours t
      LEFT JOIN kamchatka_routes kr ON t.route_id = kr.id
      LEFT JOIN bookings b ON t.id = b.tour_id
      LEFT JOIN tour_images ti ON t.id = ti.tour_id
      LEFT JOIN assets a ON ti.asset_id = a.id
      ${whereClause}
      GROUP BY t.id, kr.id
      ORDER BY t.${sortBy} ${sortOrder}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const toursResult = await query<OpTourListRow>(toursQuery, queryParams);

    const tours: OperatorTour[] = toursResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      difficulty: row.difficulty as OperatorTour['difficulty'],
      duration: row.duration,
      maxGroupSize: row.max_group_size,
      minGroupSize: row.min_group_size || 1,
      price: parseFloat(row.price),
      currency: row.currency,
      isActive: row.is_active,
      images: row.images || [],
      includes: row.includes ?? [],
      excludes: row.excludes ?? [],
      itinerary: (row.itinerary ?? []) as OperatorTour['itinerary'],
      schedule: {
        startDate: new Date(),
        endDate: undefined,
        daysOfWeek: undefined,
        timeSlots: undefined
      },
      rating: parseFloat(row.rating) || 0,
      reviewCount: parseInt(row.review_count) || 0,
      bookingsCount: parseInt(row.bookings_count) || 0,
      totalRevenue: parseFloat(row.total_revenue) || 0,
      createdAt: new Date(String(row.created_at)),
      updatedAt: new Date(String(row.updated_at)),
      routeId: row.route_id ?? undefined,
      route: row.route_id ? {
        id: row.route_id,
        title: row.route_title ?? '',
        category: row.route_category ?? '',
        lat: row.route_lat != null ? parseFloat(row.route_lat) : undefined,
        lng: row.route_lng != null ? parseFloat(row.route_lng) : undefined,
      } : undefined,
    }));

    const response: PaginatedResponse<OperatorTour> = {
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
    } as ApiResponse<PaginatedResponse<OperatorTour>>);

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch tours',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}

const CreateTourSchema = z.object({
  name: z.string().min(3, 'Название тура обязательно (минимум 3 символа)'),
  description: z.string().min(20, 'Описание тура обязательно (минимум 20 символов)'),
  price: z.number().min(1000, 'Минимальная цена тура: 1000 рублей').max(1000000, 'Максимальная цена тура: 1,000,000 рублей'),
  category: z.enum(['vulkani', 'geyzery', 'rybalka', 'termalnye_istochniki', 'medvedi', 'morskie_progulki', 'vertoletnye_tury', 'trekking', 'snegohod', 'dzhip', 'ozera', 'gory', 'reki', 'eko', 'kombo']).optional(),
  difficulty: z.enum(['easy', 'medium', 'hard', 'extreme']).optional(),
  duration: z.number().int().min(1, 'Продолжительность тура: от 1 до 30 дней').max(30, 'Продолжительность тура: от 1 до 30 дней').optional(),
  currency: z.string().optional(),
  season: z.enum(['winter', 'spring', 'summer', 'autumn', 'year-round']).optional(),
  maxGroupSize: z.number().int().min(1, 'Минимальный размер группы: 1 человек').max(100, 'Максимальный размер группы: 100 человек').optional(),
  minGroupSize: z.number().int().min(1, 'Минимальный размер группы: 1 человек').optional(),
  coordinates: z.array(z.number()).optional(),
  requirements: z.array(z.string()).optional(),
  includes: z.array(z.string()).optional(),
  excludes: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
  shortDescription: z.string().optional(),
  routeId: z.string().nullable().optional(),
  images: z.array(z.string()).optional(),
  tourImage: z.string().nullable().optional(),
}).refine(
  (data) => {
    const min = data.minGroupSize ?? 1;
    const max = data.maxGroupSize ?? 100;
    return min <= max;
  },
  { message: 'Минимальный размер группы не может превышать максимальный' }
);

/**
 * Создание нового тура (Kamchatour Hub)
 * @route POST /api/operator/tours
 * @param {NextRequest} request - HTTP-запрос (ожидает JWT)
 * @body {string} name - Название тура
 * @body {string} description - Описание
 * @body {string} category - Категория
 * ... (другие поля)
 * @returns {Promise<NextResponse>} JSON с созданным туром
 * @throws 401 если неавторизован, 404 если нет профиля, 400 если невалидно, 500 при ошибке БД
 * @security
 * - Все SQL-запросы строго параметризованы
 * - Валидация входных данных
 * @example
 * // POST /api/operator/tours { name, ... }
 * // Response: { success: true, data: { ...tour } }
 */
export async function POST(request: NextRequest) {
  try {
    const userOrResponse = await requireOperator(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const operatorId = await getOperatorPartnerId(userOrResponse.userId);
    if (!operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Партнёрский профиль оператора не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const body = await request.json();
    const parsed = CreateTourSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' }, { status: 400 });
    }
    const { name, description, price, category, difficulty, season, currency, includes: bodyIncludes, excludes: bodyExcludes, routeId, images: bodyImages, tourImage } = parsed.data;
    const minGroupSize = parsed.data.minGroupSize || 5;
    const maxGroupSize = parsed.data.maxGroupSize || 15;
    const duration = parsed.data.duration || 1;

    // === ГЕНЕРАЦИЯ SLUG ===
    const slug = name
      .toLowerCase()
      .replace(/[а-яё]/g, (char: string) => {
        const map: Record<string, string> = {
          'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
          'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
          'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
          'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch',
          'ъ': '', 'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya'
        };
        return map[char] || char;
      })
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    // === СОЗДАНИЕ ТУРА ===
    const insertQuery = `
      INSERT INTO tours (
        operator_id,
        name,
        slug,
        description,
        category,
        difficulty,
        duration,
        max_group_size,
        min_group_size,
        price,
        currency,
        season,
        route_id,
        is_active,
        includes,
        excludes,
        images,
        tour_image,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW())
      RETURNING id, name, slug, is_active, created_at
    `;

    const defaultIncludes = bodyIncludes || [
      'Размещение на базе',
      'Комплект снаряжения',
      'Сопровождение гида'
    ];
    const defaultExcludes = bodyExcludes || [
      'Трансфер до базы',
      'Одежда и обувь',
      'Аренда снастей',
      'Питание (по договоренности)'
    ];

    const values = [
      operatorId,
      name.trim(),
      slug,
      description.trim(),
      category || 'fishing',
      difficulty || 'medium',
      duration,
      maxGroupSize,
      minGroupSize,
      price,
      currency || 'RUB',
      season || 'year-round',
      routeId || null,
      false,
      JSON.stringify(defaultIncludes),
      JSON.stringify(defaultExcludes),
      JSON.stringify(bodyImages || []),
      tourImage || null,
    ];

    const result = await query<OpTourCreateRow>(insertQuery, values);
    const newTour = result.rows[0];

    // Emit tour creation event to agent bus (fire-and-forget)
    emitEvent(AGENT_EVENTS.TOUR_UPDATED, 'system', 'info', {
      tourId: newTour.id,
      tourName: newTour.name,
      operatorId,
      category: category || 'fishing',
      price,
      action: 'created',
    });

    return NextResponse.json({
      success: true,
      data: {
        id: newTour.id,
        name: newTour.name,
        slug: newTour.slug,
        status: 'draft',
        operator_id: operatorId,
        isActive: newTour.is_active,
        createdAt: new Date(String(newTour.created_at))
      },
      message: 'Тур успешно создан'
    }, { status: 201 });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to create tour',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}



