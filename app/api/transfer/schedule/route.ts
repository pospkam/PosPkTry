import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { getTransferPartnerId, checkDriverAvailability } from '@/lib/auth/transfer-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/transfer/schedule
 * Get driver schedules
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
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const driverId = searchParams.get('driverId');

    let queryStr = `
      SELECT 
        ds.*,
        d.first_name || ' ' || d.last_name as driver_name,
        v.name as vehicle_name,
        v.license_plate as vehicle_plate,
        t.booking_reference,
        t.pickup_location,
        t.dropoff_location,
        t.client_name
      FROM driver_schedules ds
      JOIN drivers d ON ds.driver_id = d.id
      LEFT JOIN vehicles v ON ds.vehicle_id = v.id
      LEFT JOIN transfers t ON ds.transfer_id = t.id
      WHERE d.operator_id = $1
    `;

    const params: any[] = [operatorId];
    let paramIndex = 2;

    if (driverId) {
      queryStr += ` AND ds.driver_id = $${paramIndex}`;
      params.push(driverId);
      paramIndex++;
    }

    if (dateFrom) {
      queryStr += ` AND ds.date >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      queryStr += ` AND ds.date <= $${paramIndex}`;
      params.push(dateTo);
      paramIndex++;
    }

    queryStr += ` ORDER BY ds.date ASC, ds.start_time ASC`;

    const result = await query(queryStr, params);

    const schedules = result.rows.map(row => ({
      id: row.id,
      driverId: row.driver_id,
      driverName: row.driver_name,
      vehicleId: row.vehicle_id,
      vehicleName: row.vehicle_name,
      vehiclePlate: row.vehicle_plate,
      date: row.date,
      startTime: row.start_time,
      endTime: row.end_time,
      location: row.location,
      type: row.type,
      transfer: row.transfer_id ? {
        id: row.transfer_id,
        bookingReference: row.booking_reference,
        pickupLocation: row.pickup_location,
        dropoffLocation: row.dropoff_location,
        clientName: row.client_name
      } : null,
      notes: row.notes,
      createdAt: row.created_at
    }));

    return NextResponse.json({
      success: true,
      data: { schedules }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get schedule error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении расписания'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/transfer/schedule
 * Create schedule entry
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

    const body = await request.json();
    const {
      driverId,
      vehicleId,
      date,
      startTime,
      endTime,
      location,
      type,
      notes
    } = body;

    if (!driverId || !date || !startTime || !endTime || !type) {
      return NextResponse.json({
        success: false,
        error: 'Заполните обязательные поля'
      } as ApiResponse<null>, { status: 400 });
    }

    // Check driver availability
    const isAvailable = await checkDriverAvailability(driverId, date, startTime, endTime);
    
    if (!isAvailable) {
      return NextResponse.json({
        success: false,
        error: 'Водитель уже занят в это время'
      } as ApiResponse<null>, { status: 400 });
    }

    const result = await query(
      `INSERT INTO driver_schedules (
        driver_id, vehicle_id, date, start_time, end_time, location, type, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *`,
      [driverId, vehicleId, date, startTime, endTime, location, type, notes]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Расписание успешно создано'
    } as ApiResponse<any>);

  } catch (error: any) {
    console.error('Create schedule error:', error);
    
    if (error.code === '23505') { // Unique violation
      return NextResponse.json({
        success: false,
        error: 'Водитель уже имеет запись в это время'
      } as ApiResponse<null>, { status: 400 });
    }
    
    return NextResponse.json({
      success: false,
      error: 'Ошибка при создании расписания'
    } as ApiResponse<null>, { status: 500 });
  }
}
