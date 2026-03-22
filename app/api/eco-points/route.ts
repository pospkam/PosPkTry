import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';
import { EcoPoint, UserEcoPoints, EcoAchievement, ApiResponse } from '@/types';
import { requireAdmin } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

const CreateEcoPointSchema = z.object({
  name: z.string().min(1, 'Название обязательно'),
  description: z.string().min(1, 'Описание обязательно'),
  coordinates: z.object({
    lat: z.number(),
    lng: z.number(),
  }),
  category: z.enum(['recycling', 'cleaning', 'conservation', 'education'], { errorMap: () => ({ message: 'Некорректная категория' }) }),
  points: z.number().positive('Баллы должны быть положительными'),
  isActive: z.boolean().optional(),
});

/**
 * Получение списка eco-points (публично, для карты/каталога)
 * @route GET /api/eco-points
 * @param {NextRequest} request - HTTP-запрос
 * @returns {Promise<NextResponse>} JSON с массивом eco-points
 * @throws 500 при ошибке БД
 * @example
 * // GET /api/eco-points?category=cleanup&lat=53.0&lng=158.6&radius=5000
 * // Response: { success: true, data: [ ...ecoPoints ] }
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius') || '5000'; // 5км по умолчанию

    // Строим WHERE условия
    const whereConditions: string[] = ['is_active = true'];
    const queryParams: (string | number)[] = [];
    let paramIndex = 1;

    if (category) {
      whereConditions.push(`category = $${paramIndex}`);
      queryParams.push(category);
      paramIndex++;
    }

    // Если указаны координаты, ищем в радиусе
    if (lat && lng) {
      const latitude = parseFloat(lat);
      const longitude = parseFloat(lng);
      const radiusMeters = parseInt(radius);

      if (!isNaN(latitude) && !isNaN(longitude)) {
        whereConditions.push(`
          ST_DWithin(
            ST_GeogFromText('POINT(' || coordinates->>'lng' || ' ' || coordinates->>'lat' || ')'),
            ST_GeogFromText('POINT($${paramIndex} $${paramIndex + 1})'),
            $${paramIndex + 2}
          )
        `);
        queryParams.push(longitude, latitude, radiusMeters);
        paramIndex += 3;
      }
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    const limitParam = paramIndex;
    queryParams.push(200);

    const ecoPointsQuery = `
      SELECT
        id,
        total_points,
        co2_saved_kg,
        trees_equivalent,
        created_at,
        updated_at
      FROM eco_points
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${limitParam}
    `;

    const result = await query(ecoPointsQuery, queryParams);

    const ecoPoints = result.rows.map(row => ({
      id: row.id,
      totalPoints: row.total_points,
      co2SavedKg: row.co2_saved_kg,
      treesEquivalent: row.trees_equivalent,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data: ecoPoints,
    } as ApiResponse<unknown>);

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch eco-points',
      message: error instanceof Error ? error.message : 'Unknown error',
    } as ApiResponse<null>, { status: 500 });
  }
}

// POST /api/eco-points - Создание нового Eco-point (admin only)
export async function POST(request: NextRequest) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const body = await request.json();
    const parsed = CreateEcoPointSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({
        success: false,
        error: parsed.error.issues[0]?.message || 'Некорректные данные',
      } as ApiResponse<null>, { status: 400 });
    }

    // Создаем Eco-point
    const createEcoPointQuery = `
      INSERT INTO eco_points (
        name, description, coordinates, category, points, is_active
      ) VALUES (
        $1, $2, $3, $4, $5, $6
      ) RETURNING id, created_at
    `;

    const ecoPointParams = [
      parsed.data.name,
      parsed.data.description,
      JSON.stringify(parsed.data.coordinates),
      parsed.data.category,
      parsed.data.points,
      parsed.data.isActive !== false, // По умолчанию активен
    ];

    const result = await query(createEcoPointQuery, ecoPointParams);

    return NextResponse.json({
      success: true,
      data: { id: result.rows[0].id, createdAt: result.rows[0].created_at },
      message: 'Eco-point created successfully',
    } as ApiResponse<{ id: string; createdAt: Date }>);

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Failed to create eco-point',
      message: error instanceof Error ? error.message : 'Unknown error',
    } as ApiResponse<null>, { status: 500 });
  }
}