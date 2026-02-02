import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { Tour, ApiResponse } from '@/types';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';

// GET /api/tours - Получение списка туров
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activity = searchParams.get('activity');
    const search = searchParams.get('search');
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = parseInt(searchParams.get('offset') || '0');

    // Формируем SQL запрос с фильтрами
    const whereConditions = ['t.is_active = true'];
    const queryParams: any[] = [];
    let paramIndex = 1;

    if (activity) {
      whereConditions.push(`t.activity = $${paramIndex}`);
      queryParams.push(activity);
      paramIndex++;
    }

    if (search) {
      whereConditions.push(`(t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (minPrice) {
      whereConditions.push(`t.price_from >= $${paramIndex}`);
      queryParams.push(parseInt(minPrice));
      paramIndex++;
    }

    if (maxPrice) {
      whereConditions.push(`t.price_from <= $${paramIndex}`);
      queryParams.push(parseInt(maxPrice));
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const toursQuery = `
      SELECT 
        t.id,
        t.title,
        t.description,
        t.activity,
        t.duration,
        t.difficulty,
        t.price_from,
        t.price_to,
        t.max_participants,
        t.min_participants,
        t.weather_requirements,
        t.safety_requirements,
        t.equipment_included,
        t.equipment_required,
        t.meeting_point,
        t.meeting_time,
        t.images,
        t.rating,
        t.reviews_count,
        t.is_active,
        t.created_at,
        t.updated_at,
        p.name as operator_name,
        p.rating as operator_rating,
        p.email as operator_email
      FROM tours t
      LEFT JOIN partners p ON t.operator_id = p.id
      WHERE t.is_active = true
      ${whereClause}
      ORDER BY t.rating DESC, t.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);

    const result = await query(toursQuery, queryParams);

    // Получаем общее количество туров для пагинации
    const countQuery = `
      SELECT COUNT(*) as total
      FROM tours t
      LEFT JOIN partners p ON t.operator_id = p.id
      ${whereClause}
    `;

    const countResult = await query(countQuery, queryParams.slice(0, -2));
    const total = parseInt(countResult.rows[0]?.total || '0');

    const tours: Tour[] = result.rows.map(row => ({
      id: row.id,
      title: row.title,
      description: row.description,
      activity: row.activity,
      duration: row.duration,
      difficulty: row.difficulty,
      priceFrom: row.price_from,
      priceTo: row.price_to,
      maxParticipants: row.max_participants,
      minParticipants: row.min_participants,
      weatherRequirements: row.weather_requirements,
      safetyRequirements: row.safety_requirements,
      equipmentIncluded: row.equipment_included || [],
      equipmentRequired: row.equipment_required || [],
      meetingPoint: row.meeting_point,
      meetingTime: row.meeting_time,
      images: row.images || [],
      rating: row.rating || 0,
      reviewsCount: row.reviews_count || 0,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      operator: {
        id: row.operator_id,
        name: row.operator_name,
        rating: row.operator_rating || 0,
        phone: row.operator_phone,
        email: row.operator_email,
      },
    }));

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
    } as ApiResponse<{ tours: Tour[]; pagination: any }>);

  } catch (error) {
    console.error('Error fetching tours:', error);
    
    // Возвращаем тестовые данные если БД недоступна
    const mockTours: Tour[] = [
      {
        id: '1',
        title: 'Восхождение на Авачинский вулкан',
        description: 'Классический маршрут на один из самых доступных вулканов Камчатки. Потрясающие виды на Петропавловск-Камчатский и Тихий океан.',
        activity: 'hiking',
        duration: '8-10 часов',
        difficulty: 'medium',
        priceFrom: 15000,
        priceTo: 20000,
        maxParticipants: 12,
        minParticipants: 2,
        weatherRequirements: 'Без осадков, видимость > 5 км',
        safetyRequirements: 'Опыт горных походов, физическая подготовка',
        equipmentIncluded: ['Трекинговые палки', 'Каска', 'Рация'],
        equipmentRequired: ['Трекинговые ботинки', 'Теплая одежда', 'Вода 2л'],
        meetingPoint: 'Площадь Ленина, Петропавловск-Камчатский',
        meetingTime: '07:00',
        images: [
          'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
          'https://images.unsplash.com/photo-1464822759844-d150baecf4b0?w=800',
        ],
        rating: 4.8,
        reviewsCount: 127,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        operator: {
          id: '1',
          name: 'Камчатские приключения',
          rating: 4.9,
          phone: '+7 (4152) 123-456',
          email: 'info@kamchatka-adventures.ru',
        },
      },
      {
        id: '2',
        title: 'Долина гейзеров',
        description: 'Уникальная экосистема с горячими источниками, гейзерами и термальными озерами. Включен в список Всемирного наследия ЮНЕСКО.',
        activity: 'sightseeing',
        duration: '6-8 часов',
        difficulty: 'easy',
        priceFrom: 25000,
        priceTo: 30000,
        maxParticipants: 20,
        minParticipants: 4,
        weatherRequirements: 'Любая погода',
        safetyRequirements: 'Соблюдение правил безопасности',
        equipmentIncluded: ['Трансфер', 'Гид', 'Обед'],
        equipmentRequired: ['Удобная обувь', 'Куртка от дождя'],
        meetingPoint: 'Аэропорт Елизово',
        meetingTime: '09:00',
        images: [
          'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
          'https://images.unsplash.com/photo-1464822759844-d150baecf4b0?w=800',
        ],
        rating: 4.9,
        reviewsCount: 89,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        operator: {
          id: '2',
          name: 'Гейзер тур',
          rating: 4.7,
          phone: '+7 (4152) 234-567',
          email: 'info@geyser-tour.ru',
        },
      },
      {
        id: '3',
        title: 'Медвежье сафари',
        description: 'Наблюдение за бурыми медведями в их естественной среде обитания. Безопасное расстояние с опытными гидами.',
        activity: 'wildlife',
        duration: '4-6 часов',
        difficulty: 'easy',
        priceFrom: 12000,
        priceTo: 15000,
        maxParticipants: 8,
        minParticipants: 2,
        weatherRequirements: 'Любая погода',
        safetyRequirements: 'Строгое соблюдение инструкций гида',
        equipmentIncluded: ['Бинокль', 'Рация', 'Спасательный жилет'],
        equipmentRequired: ['Теплая одежда', 'Фотоаппарат'],
        meetingPoint: 'Причал в бухте Русская',
        meetingTime: '06:00',
        images: [
          'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=800',
          'https://images.unsplash.com/photo-1464822759844-d150baecf4b0?w=800',
        ],
        rating: 4.6,
        reviewsCount: 156,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        operator: {
          id: '3',
          name: 'Дикая природа Камчатки',
          rating: 4.8,
          phone: '+7 (4152) 345-678',
          email: 'info@wild-kamchatka.ru',
        },
      },
    ];

    return NextResponse.json({
      success: true,
      data: {
        tours: mockTours,
        pagination: {
          total: mockTours.length,
          limit: 20,
          offset: 0,
          hasMore: false,
        },
      },
    } as ApiResponse<{ tours: Tour[]; pagination: any }>);
  }
}

// POST /api/tours - Создание нового тура
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      title,
      description,
      activity,
      duration,
      difficulty,
      priceFrom,
      priceTo,
      maxParticipants,
      minParticipants,
      weatherRequirements,
      safetyRequirements,
      equipmentIncluded,
      equipmentRequired,
      meetingPoint,
      meetingTime,
      images,
      operatorId,
    } = body;

    // Валидация обязательных полей
    if (!title || !description || !activity || !operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: title, description, activity, operatorId',
      } as ApiResponse<null>, { status: 400 });
    }

    const insertQuery = `
      INSERT INTO tours (
        title, description, activity, duration, difficulty,
        price_from, price_to, max_participants, min_participants,
        weather_requirements, safety_requirements, equipment_included,
        equipment_required, meeting_point, meeting_time, images,
        operator_id, is_active, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, true, NOW(), NOW()
      ) RETURNING id
    `;

    const result = await query(insertQuery, [
      title,
      description,
      activity,
      duration || null,
      difficulty || null,
      priceFrom || null,
      priceTo || null,
      maxParticipants || null,
      minParticipants || null,
      weatherRequirements || null,
      safetyRequirements || null,
      JSON.stringify(equipmentIncluded || []),
      JSON.stringify(equipmentRequired || []),
      meetingPoint || null,
      meetingTime || null,
      JSON.stringify(images || []),
      operatorId,
    ]);

    return NextResponse.json({
      success: true,
      data: {
        id: result.rows[0].id,
        message: 'Tour created successfully',
      },
    } as ApiResponse<{ id: string; message: string }>);

  } catch (error) {
    console.error('Error creating tour:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create tour',
      message: error instanceof Error ? error.message : 'Unknown error',
    } as ApiResponse<null>, { status: 500 });
  }
}