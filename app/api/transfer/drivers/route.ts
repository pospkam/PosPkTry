import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { getTransferPartnerId } from '@/lib/auth/transfer-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/transfer/drivers
 * Get transfer operator's drivers
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
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let queryStr = `
      SELECT 
        d.*,
        v.name as vehicle_name,
        v.license_plate as vehicle_plate,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as completed_trips,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status IN ('pending', 'assigned', 'confirmed', 'in_progress')) as active_trips
      FROM drivers d
      LEFT JOIN vehicles v ON d.vehicle_id = v.id
      LEFT JOIN transfers t ON d.id = t.driver_id
      WHERE d.operator_id = $1
    `;

    const params: any[] = [operatorId];
    let paramIndex = 2;

    if (status !== 'all') {
      queryStr += ` AND d.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    queryStr += `
      GROUP BY d.id, v.name, v.license_plate
      ORDER BY d.created_at DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await query(queryStr, params);

    const drivers = result.rows.map(row => ({
      id: row.id,
      firstName: row.first_name,
      lastName: row.last_name,
      phone: row.phone,
      email: row.email,
      licenseNumber: row.license_number,
      licenseExpiry: row.license_expiry,
      experience: row.experience,
      languages: row.languages,
      rating: parseFloat(row.rating),
      totalTrips: row.total_trips,
      completedTrips: parseInt(row.completed_trips || 0),
      activeTrips: parseInt(row.active_trips || 0),
      status: row.status,
      vehicleId: row.vehicle_id,
      vehicleName: row.vehicle_name,
      vehiclePlate: row.vehicle_plate,
      hireDate: row.hire_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return NextResponse.json({
      success: true,
      data: { drivers }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get drivers error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении водителей'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/transfer/drivers
 * Create new driver
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
      firstName,
      lastName,
      phone,
      email,
      licenseNumber,
      licenseExpiry,
      experience,
      languages,
      vehicleId,
      emergencyContact
    } = body;

    // Validation
    if (!firstName || !lastName || !phone || !licenseNumber || !licenseExpiry) {
      return NextResponse.json({
        success: false,
        error: 'Заполните обязательные поля'
      } as ApiResponse<null>, { status: 400 });
    }

    const result = await query(
      `INSERT INTO drivers (
        operator_id, first_name, last_name, phone, email,
        license_number, license_expiry, experience, languages,
        vehicle_id, emergency_contact, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'active')
      RETURNING *`,
      [
        operatorId,
        firstName,
        lastName,
        phone,
        email,
        licenseNumber,
        licenseExpiry,
        experience || 0,
        JSON.stringify(languages || []),
        vehicleId,
        JSON.stringify(emergencyContact || {})
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Водитель успешно добавлен'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Create driver error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при создании водителя'
    } as ApiResponse<null>, { status: 500 });
  }
}
