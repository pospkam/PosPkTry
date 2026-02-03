import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse, PaginatedResponse } from '@/types';
import { OperatorTour } from '@/types/operator';

export const dynamic = 'force-dynamic';

/**
 * GET /api/operator/tours
 * Получение списка туров оператора
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const operatorId = searchParams.get('operatorId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    
    const status = searchParams.get('status'); // 'active', 'inactive', 'all'
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const sortBy = searchParams.get('sortBy') || 'created_at';
    const sortOrder = searchParams.get('sortOrder') || 'desc';

    if (!operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Operator ID is required'
      } as ApiResponse<null>, { status: 400 });
    }

    const whereConditions: string[] = ['t.operator_id = $1'];
    const queryParams: any[] = [operatorId];
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
      SELECT COUNT(*) as total
      FROM tours t
      ${whereClause}
    `;

    const countResult = await query(countQuery, queryParams);
    const total = parseInt(countResult.rows[0].total);

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
        COALESCE(COUNT(DISTINCT b.id), 0) as bookings_count,
        COALESCE(SUM(CASE WHEN b.status IN ('confirmed', 'completed') THEN b.total_price ELSE 0 END), 0) as total_revenue,
        ARRAY_AGG(DISTINCT a.url) FILTER (WHERE a.url IS NOT NULL) as images
      FROM tours t
      LEFT JOIN bookings b ON t.id = b.tour_id
      LEFT JOIN tour_images ti ON t.id = ti.tour_id
      LEFT JOIN assets a ON ti.asset_id = a.id
      ${whereClause}
      GROUP BY t.id
      ORDER BY t.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const toursResult = await query(toursQuery, queryParams);

    const tours: OperatorTour[] = toursResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      category: row.category,
      difficulty: row.difficulty,
      duration: parseInt(row.duration),
      maxGroupSize: parseInt(row.max_group_size),
      minGroupSize: parseInt(row.min_group_size) || 1,
      price: parseFloat(row.price),
      currency: row.currency,
      isActive: row.is_active,
      images: row.images || [],
      includes: [], // TODO: Получить из БД
      excludes: [], // TODO: Получить из БД
      itinerary: [], // TODO: Получить из БД
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
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
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
    console.error('Error fetching operator tours:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch tours',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/operator/tours
 * Создание нового тура
 * 
 * Бизнес-логика на основе партнера fishingkam.ru:
 * - Минимальная группа: 5 человек
 * - Сезонность с разными ценами
 * - Включено/не включено в стоимость
 * - Виды рыб по сезонам
 */
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const operatorId = searchParams.get('operatorId');

    if (!operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Operator ID is required'
      } as ApiResponse<null>, { status: 400 });
    }

    const body = await request.json();

    // === ВАЛИДАЦИЯ ===
    const errors: string[] = [];

    // Обязательные поля
    if (!body.name || body.name.trim().length < 3) {
      errors.push('Название тура обязательно (минимум 3 символа)');
    }
    if (!body.description || body.description.trim().length < 20) {
      errors.push('Описание тура обязательно (минимум 20 символов)');
    }
    if (body.price === undefined || body.price === null) {
      errors.push('Цена тура обязательна');
    }

    // Валидация цены
    if (body.price !== undefined) {
      if (typeof body.price !== 'number' || body.price < 0) {
        errors.push('Цена должна быть положительным числом');
      }
      if (body.price < 1000) {
        errors.push('Минимальная цена тура: 1000 рублей');
      }
      if (body.price > 1000000) {
        errors.push('Максимальная цена тура: 1,000,000 рублей');
      }
    }

    // Валидация размера группы (на основе fishingkam.ru - мин. 5 человек)
    const minGroupSize = body.minGroupSize || 5;
    const maxGroupSize = body.maxGroupSize || 15;

    if (minGroupSize < 1) {
      errors.push('Минимальный размер группы: 1 человек');
    }
    if (maxGroupSize > 100) {
      errors.push('Максимальный размер группы: 100 человек');
    }
    if (minGroupSize > maxGroupSize) {
      errors.push('Минимальный размер группы не может превышать максимальный');
    }

    // Валидация продолжительности
    const duration = body.duration || 1;
    if (duration < 1 || duration > 30) {
      errors.push('Продолжительность тура: от 1 до 30 дней');
    }

    // Валидация сезона
    const validSeasons = ['winter', 'spring', 'summer', 'autumn', 'year-round'];
    if (body.season && !validSeasons.includes(body.season)) {
      errors.push(`Сезон должен быть одним из: ${validSeasons.join(', ')}`);
    }

    // Валидация категории
    const validCategories = ['fishing', 'hunting', 'adventure', 'eco', 'cultural', 'family'];
    if (body.category && !validCategories.includes(body.category)) {
      errors.push(`Категория должна быть одной из: ${validCategories.join(', ')}`);
    }

    // Валидация сложности
    const validDifficulties = ['easy', 'medium', 'hard', 'extreme'];
    if (body.difficulty && !validDifficulties.includes(body.difficulty)) {
      errors.push(`Сложность должна быть одной из: ${validDifficulties.join(', ')}`);
    }

    // Если есть ошибки - возвращаем 400
    if (errors.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Validation failed',
        errors: errors
      } as ApiResponse<null>, { status: 400 });
    }

    // === ГЕНЕРАЦИЯ SLUG ===
    const slug = body.name
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
        is_active,
        includes,
        excludes,
        created_at,
        updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
      RETURNING id, name, slug, is_active, created_at
    `;

    // Стандартные включения/исключения на основе fishingkam.ru
    const defaultIncludes = body.includes || [
      'Размещение на базе',
      'Комплект снаряжения',
      'Сопровождение гида'
    ];
    const defaultExcludes = body.excludes || [
      'Трансфер до базы',
      'Одежда и обувь',
      'Аренда снастей',
      'Питание (по договоренности)'
    ];

    const values = [
      operatorId,
      body.name.trim(),
      slug,
      body.description.trim(),
      body.category || 'fishing',
      body.difficulty || 'medium',
      duration,
      maxGroupSize,
      minGroupSize,
      body.price,
      body.currency || 'RUB',
      body.season || 'year-round',
      false, // Новые туры создаются как черновики (draft)
      JSON.stringify(defaultIncludes),
      JSON.stringify(defaultExcludes)
    ];

    const result = await query(insertQuery, values);
    const newTour = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        id: newTour.id,
        name: newTour.name,
        slug: newTour.slug,
        status: 'draft',
        operator_id: operatorId,
        isActive: newTour.is_active,
        createdAt: new Date(newTour.created_at)
      },
      message: 'Тур успешно создан'
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating tour:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create tour',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}



