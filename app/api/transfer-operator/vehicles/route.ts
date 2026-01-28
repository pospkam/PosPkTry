import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/pillars/core-infrastructure-infrastructure/lib/database';
import { ApiResponse, Vehicle, VehicleFormData } from '@/types';
import { requireTransferOperator } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/transfer-operator/vehicles - Получить список транспортных средств
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireTransferOperator(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;
    
    const operatorId = userOrResponse.userId;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const type = searchParams.get('type') || 'all';
    const limit = parseInt(searchParams.get('limit') || '50');

    let whereClause = 'WHERE operator_id = $1';
    const params = [operatorId];

    if (status !== 'all') {
      whereClause += ` AND status = $${params.length + 1}`;
      params.push(status);
    }

    if (type !== 'all') {
      whereClause += ` AND type = $${params.length + 1}`;
      params.push(type);
    }

    const vehiclesQuery = `
      SELECT
        id,
        name,
        type,
        license_plate,
        capacity,
        category,
        status,
        location,
        features,
        images,
        created_at,
        updated_at
      FROM vehicles
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT $${params.length + 1}
    `;

    params.push(limit);
    const vehiclesResult = await query(vehiclesQuery, params);

    const vehicles: Vehicle[] = vehiclesResult.rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      licensePlate: row.license_plate,
      capacity: row.capacity,
      category: row.category,
      status: row.status,
      location: row.location,
      features: JSON.parse(row.features || '[]'),
      images: JSON.parse(row.images || '[]'),
      documents: [], // TODO: загрузить документы
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return NextResponse.json({
      success: true,
      data: {
        vehicles,
        total: vehicles.length
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error fetching vehicles:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении списка транспортных средств'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/transfer-operator/vehicles - Создать новое транспортное средство
 */
export async function POST(request: NextRequest) {
  try {
    const userOrResponse = await requireTransferOperator(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;
    
    const operatorId = userOrResponse.userId;

    const body: VehicleFormData = await request.json();
    const {
      name,
      type,
      licensePlate,
      capacity,
      category,
      location,
      features
    } = body;

    if (!name || !licensePlate || !capacity) {
      return NextResponse.json({
        success: false,
        error: 'Необходимо указать название, госномер и вместимость'
      } as ApiResponse<null>, { status: 400 });
    }

    // Проверяем уникальность госномера
    const existingVehicleQuery = `
      SELECT id FROM vehicles WHERE license_plate = $1
    `;

    const existingResult = await query(existingVehicleQuery, [licensePlate]);
    if (existingResult.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'Транспортное средство с таким госномером уже существует'
      } as ApiResponse<null>, { status: 400 });
    }

    // Создаем транспортное средство
    const createVehicleQuery = `
      INSERT INTO vehicles (
        id,
        operator_id,
        name,
        type,
        license_plate,
        capacity,
        category,
        status,
        location,
        features,
        images,
        created_at,
        updated_at
      ) VALUES (
        gen_random_uuid(),
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW()
      )
      RETURNING id, created_at
    `;

    const vehicleResult = await query(createVehicleQuery, [
      operatorId,
      name,
      type,
      licensePlate,
      capacity,
      category,
      'active', // status
      location || 'Камчатка', // default location
      JSON.stringify(features || []),
      JSON.stringify([]) // images
    ]);

    const newVehicle = vehicleResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        vehicleId: newVehicle.id,
        createdAt: newVehicle.created_at
      },
      message: 'Транспортное средство успешно создано'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error creating vehicle:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при создании транспортного средства'
    } as ApiResponse<null>, { status: 500 });
  }
}
