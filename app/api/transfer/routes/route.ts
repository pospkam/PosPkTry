import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { getTransferPartnerId } from '@/lib/auth/transfer-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/transfer/routes
 * Get transfer routes
 */
// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'transfer') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    const operatorId = await getTransferPartnerId(userId);
    
    if (!operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Профиль трансферного оператора не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const active = searchParams.get('active');
    const popular = searchParams.get('popular');

    let queryStr = `
      SELECT * FROM transfer_routes 
      WHERE operator_id = $1
    `;

    const params: any[] = [operatorId];

    if (active === 'true') {
      queryStr += ` AND is_active = true`;
    }

    if (popular === 'true') {
      queryStr += ` AND popular = true`;
    }

    queryStr += ` ORDER BY transfers_count DESC, average_rating DESC`;

    const result = await query(queryStr, params);

    const routes = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      fromLocation: row.from_location,
      toLocation: row.to_location,
      fromCoordinates: row.from_coordinates,
      toCoordinates: row.to_coordinates,
      distance: parseFloat(row.distance),
      estimatedDuration: row.estimated_duration,
      basePrice: parseFloat(row.base_price),
      pricePerKm: row.price_per_km ? parseFloat(row.price_per_km) : null,
      pricePerHour: row.price_per_hour ? parseFloat(row.price_per_hour) : null,
      popular: row.popular,
      transfersCount: row.transfers_count,
      averageRating: parseFloat(row.average_rating),
      isActive: row.is_active,
      weatherDependent: row.weather_dependent,
      stops: row.stops,
      description: row.description,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return NextResponse.json({
      success: true,
      data: { routes }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get routes error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении маршрутов'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/transfer/routes
 * Create new route
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'transfer') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    const operatorId = await getTransferPartnerId(userId);
    
    if (!operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Профиль трансферного оператора не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      fromLocation,
      toLocation,
      fromCoordinates,
      toCoordinates,
      distance,
      estimatedDuration,
      basePrice,
      pricePerKm,
      pricePerHour,
      weatherDependent,
      stops,
      description
    } = body;

    if (!name || !fromLocation || !toLocation || !basePrice) {
      return NextResponse.json({
        success: false,
        error: 'Заполните обязательные поля'
      } as ApiResponse<null>, { status: 400 });
    }

    const result = await query(
      `INSERT INTO transfer_routes (
        operator_id, name, from_location, to_location, from_coordinates, to_coordinates,
        distance, estimated_duration, base_price, price_per_km, price_per_hour,
        weather_dependent, stops, description, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true)
      RETURNING *`,
      [
        operatorId,
        name,
        fromLocation,
        toLocation,
        JSON.stringify(fromCoordinates || {}),
        JSON.stringify(toCoordinates || {}),
        distance,
        estimatedDuration,
        basePrice,
        pricePerKm,
        pricePerHour,
        weatherDependent || false,
        JSON.stringify(stops || []),
        description
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Маршрут успешно создан'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Create route error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при создании маршрута'
    } as ApiResponse<null>, { status: 500 });
  }
}
