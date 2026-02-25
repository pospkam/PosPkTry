import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { EcoPoint, UserEcoPoints, EcoAchievement, ApiResponse } from '@/types';
import { requireAdmin } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

// GET /api/eco-points - Public (map listing)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const lat = searchParams.get('lat');
    const lng = searchParams.get('lng');
    const radius = searchParams.get('radius') || '5000'; // 5км по умолчанию

    // Строим WHERE условия
    const whereConditions: string[] = ['is_active = true'];
    const queryParams: any[] = [];
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

    const ecoPointsQuery = `
      SELECT 
        id,
        name,
        description,
        coordinates,
        category,
        points,
        is_active,
        created_at
      FROM eco_points
      ${whereClause}
      ORDER BY created_at DESC
    `;

    const result = await query(ecoPointsQuery, queryParams);

    const ecoPoints: EcoPoint[] = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description,
      coordinates: row.coordinates,
      category: row.category,
      points: row.points,
      isActive: row.is_active,
      createdAt: new Date(row.created_at),
    }));

    return NextResponse.json({
      success: true,
      data: ecoPoints,
    } as ApiResponse<EcoPoint[]>);

  } catch (error) {
    console.error('Error fetching eco-points:', error);
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
    
    // Валидация обязательных полей
    const requiredFields = ['name', 'description', 'coordinates', 'category', 'points'];
    for (const field of requiredFields) {
      if (!body[field]) {
        return NextResponse.json({
          success: false,
          error: `Missing required field: ${field}`,
        } as ApiResponse<null>, { status: 400 });
      }
    }

    // Валидация категории
    const validCategories = ['recycling', 'cleaning', 'conservation', 'education'];
    if (!validCategories.includes(body.category)) {
      return NextResponse.json({
        success: false,
        error: `Invalid category. Must be one of: ${validCategories.join(', ')}`,
      } as ApiResponse<null>, { status: 400 });
    }

    // Валидация координат
    if (!body.coordinates.lat || !body.coordinates.lng) {
      return NextResponse.json({
        success: false,
        error: 'Coordinates must include lat and lng',
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
      body.name,
      body.description,
      JSON.stringify(body.coordinates),
      body.category,
      body.points,
      body.isActive !== false, // По умолчанию активен
    ];

    const result = await query(createEcoPointQuery, ecoPointParams);

    return NextResponse.json({
      success: true,
      data: { id: result.rows[0].id, createdAt: result.rows[0].created_at },
      message: 'Eco-point created successfully',
    } as ApiResponse<{ id: string; createdAt: Date }>);

  } catch (error) {
    console.error('Error creating eco-point:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create eco-point',
      message: error instanceof Error ? error.message : 'Unknown error',
    } as ApiResponse<null>, { status: 500 });
  }
}