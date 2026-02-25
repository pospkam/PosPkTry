import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { getTransferPartnerId } from '@/lib/auth/transfer-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/transfer/vehicles
 * Get transfer operator's vehicles
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
    const status = searchParams.get('status') || 'all';
    const type = searchParams.get('type') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let queryStr = `
      SELECT 
        v.*,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as completed_trips,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status IN ('pending', 'assigned', 'confirmed', 'in_progress')) as active_trips
      FROM vehicles v
      LEFT JOIN transfers t ON v.id = t.vehicle_id
      WHERE v.operator_id = $1
    `;

    const params: any[] = [operatorId];
    let paramIndex = 2;

    if (status !== 'all') {
      queryStr += ` AND v.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (type !== 'all') {
      queryStr += ` AND v.type = $${paramIndex}`;
      params.push(type);
      paramIndex++;
    }

    queryStr += `
      GROUP BY v.id
      ORDER BY v.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await query(queryStr, params);

    // Get total count
    let countQuery = `SELECT COUNT(*) FROM vehicles WHERE operator_id = $1`;
    const countParams: any[] = [operatorId];
    let countIndex = 2;

    if (status !== 'all') {
      countQuery += ` AND status = $${countIndex}`;
      countParams.push(status);
      countIndex++;
    }

    if (type !== 'all') {
      countQuery += ` AND type = $${countIndex}`;
      countParams.push(type);
    }

    const countResult = await query(countQuery, countParams);
    const totalCount = parseInt(countResult.rows[0].count);

    const vehicles = result.rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      licensePlate: row.license_plate,
      capacity: row.capacity,
      category: row.category,
      status: row.status,
      location: row.location,
      features: row.features,
      images: row.images,
      year: row.year,
      color: row.color,
      mileage: row.mileage,
      fuelType: row.fuel_type,
      lastServiceDate: row.last_service_date,
      nextServiceDate: row.next_service_date,
      completedTrips: parseInt(row.completed_trips || 0),
      activeTrips: parseInt(row.active_trips || 0),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return NextResponse.json({
      success: true,
      data: {
        vehicles,
        pagination: {
          page,
          limit,
          totalCount,
          totalPages: Math.ceil(totalCount / limit)
        }
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get vehicles error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении транспорта'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/transfer/vehicles
 * Create new vehicle
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
      type,
      licensePlate,
      capacity,
      category,
      location,
      features,
      year,
      color,
      fuelType,
      vin
    } = body;

    // Validation
    if (!name || !type || !licensePlate || !capacity) {
      return NextResponse.json({
        success: false,
        error: 'Заполните обязательные поля: название, тип, госномер, вместимость'
      } as ApiResponse<null>, { status: 400 });
    }

    // Check unique license plate
    const existingResult = await query(
      'SELECT id FROM vehicles WHERE license_plate = $1',
      [licensePlate]
    );

    if (existingResult.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Транспорт с таким госномером уже существует'
      } as ApiResponse<null>, { status: 400 });
    }

    // Create vehicle
    const result = await query(
      `INSERT INTO vehicles (
        operator_id, name, type, license_plate, capacity, category,
        location, features, year, color, fuel_type, vin, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'active')
      RETURNING *`,
      [
        operatorId,
        name,
        type,
        licensePlate,
        capacity,
        category || 'economy',
        location || 'Петропавловск-Камчатский',
        JSON.stringify(features || []),
        year,
        color,
        fuelType,
        vin
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Транспорт успешно добавлен'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Create vehicle error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при создании транспорта'
    } as ApiResponse<null>, { status: 500 });
  }
}
