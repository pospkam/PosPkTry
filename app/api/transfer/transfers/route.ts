import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { 
  getTransferPartnerId,
  generateBookingReference,
  findAvailableVehicle,
  findAvailableDriver,
  calculateTransferPrice
} from '@/lib/auth/transfer-helpers';
import { requireTransferOperator } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/transfer/transfers
 * Get transfer operator's transfers
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireTransferOperator(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult.userId;

    const operatorId = await getTransferPartnerId(userId);
    
    if (!operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Профиль трансферного оператора не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const dateFrom = searchParams.get('dateFrom');
    const dateTo = searchParams.get('dateTo');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = (page - 1) * limit;

    let queryStr = `
      SELECT 
        t.*,
        v.name as vehicle_name,
        v.license_plate as vehicle_plate,
        d.first_name || ' ' || d.last_name as driver_name,
        d.phone as driver_phone,
        r.name as route_name
      FROM transfers t
      LEFT JOIN vehicles v ON t.vehicle_id = v.id
      LEFT JOIN drivers d ON t.driver_id = d.id
      LEFT JOIN transfer_routes r ON t.route_id = r.id
      WHERE t.operator_id = $1
    `;

    const params: any[] = [operatorId];
    let paramIndex = 2;

    if (status !== 'all') {
      queryStr += ` AND t.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (dateFrom) {
      queryStr += ` AND t.pickup_datetime >= $${paramIndex}`;
      params.push(dateFrom);
      paramIndex++;
    }

    if (dateTo) {
      queryStr += ` AND t.pickup_datetime <= $${paramIndex}`;
      params.push(dateTo + ' 23:59:59');
      paramIndex++;
    }

    queryStr += `
      ORDER BY t.pickup_datetime DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
    params.push(limit, offset);

    const result = await query(queryStr, params);

    const transfers = result.rows.map(row => ({
      id: row.id,
      bookingReference: row.booking_reference,
      clientName: row.client_name,
      clientPhone: row.client_phone,
      clientEmail: row.client_email,
      pickupLocation: row.pickup_location,
      dropoffLocation: row.dropoff_location,
      pickupDatetime: row.pickup_datetime,
      dropoffDatetime: row.dropoff_datetime,
      passengers: row.passengers,
      luggage: row.luggage,
      price: parseFloat(row.price),
      status: row.status,
      paymentStatus: row.payment_status,
      vehicle: row.vehicle_id ? {
        id: row.vehicle_id,
        name: row.vehicle_name,
        plate: row.vehicle_plate
      } : null,
      driver: row.driver_id ? {
        id: row.driver_id,
        name: row.driver_name,
        phone: row.driver_phone
      } : null,
      routeName: row.route_name,
      specialRequests: row.special_requests,
      rating: row.rating,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return NextResponse.json({
      success: true,
      data: { transfers }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get transfers error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении трансферов'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/transfer/transfers
 * Create new transfer booking
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireTransferOperator(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult.userId;

    const operatorId = await getTransferPartnerId(userId);
    
    if (!operatorId) {
      return NextResponse.json({
        success: false,
        error: 'Профиль трансферного оператора не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const body = await request.json();
    const {
      routeId,
      clientName,
      clientPhone,
      clientEmail,
      pickupLocation,
      dropoffLocation,
      pickupDatetime,
      passengers,
      luggage,
      specialRequests,
      vehicleId,
      driverId,
      autoAssign = true
    } = body;

    // Validation
    if (!clientName || !clientPhone || !pickupLocation || !dropoffLocation || !pickupDatetime || !passengers) {
      return NextResponse.json({
        success: false,
        error: 'Заполните обязательные поля'
      } as ApiResponse<null>, { status: 400 });
    }

    // Calculate price
    let price = 0;
    if (routeId) {
      price = await calculateTransferPrice(routeId, passengers, pickupDatetime.split('T')[0]);
    }

    // Auto-assign vehicle and driver if requested
    let finalVehicleId = vehicleId;
    let finalDriverId = driverId;

    if (autoAssign && !finalVehicleId) {
      const pickupDate = pickupDatetime.split('T')[0];
      const pickupTime = pickupDatetime.split('T')[1].substring(0, 5);
      const endTime = new Date(new Date(pickupDatetime).getTime() + 2 * 60 * 60 * 1000)
        .toISOString().split('T')[1].substring(0, 5);

      finalVehicleId = await findAvailableVehicle(
        operatorId,
        passengers,
        pickupDate,
        pickupTime,
        endTime
      );

      if (finalVehicleId && !finalDriverId) {
        finalDriverId = await findAvailableDriver(
          operatorId,
          finalVehicleId,
          pickupDate,
          pickupTime,
          endTime
        );
      }
    }

    // Generate booking reference
    const bookingReference = await generateBookingReference();

    // Create transfer
    const result = await query(
      `INSERT INTO transfers (
        booking_reference, operator_id, route_id, client_name, client_phone, client_email,
        pickup_location, dropoff_location, pickup_datetime, passengers, luggage,
        special_requests, price, vehicle_id, driver_id, status, payment_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
      RETURNING *`,
      [
        bookingReference,
        operatorId,
        routeId,
        clientName,
        clientPhone,
        clientEmail,
        pickupLocation,
        dropoffLocation,
        pickupDatetime,
        passengers,
        luggage || 0,
        specialRequests,
        price || 0,
        finalVehicleId,
        finalDriverId,
        finalDriverId ? 'assigned' : 'pending',
        'pending'
      ]
    );

    // Create driver schedule if driver assigned
    if (finalDriverId && finalVehicleId) {
      const pickupDate = pickupDatetime.split('T')[0];
      const pickupTime = pickupDatetime.split('T')[1].substring(0, 5);
      const endTime = new Date(new Date(pickupDatetime).getTime() + 2 * 60 * 60 * 1000)
        .toISOString().split('T')[1].substring(0, 5);

      await query(
        `INSERT INTO driver_schedules (driver_id, vehicle_id, date, start_time, end_time, transfer_id, type)
         VALUES ($1, $2, $3, $4, $5, $6, 'booked')
         ON CONFLICT (driver_id, date, start_time) DO UPDATE
         SET transfer_id = $6, type = 'booked'`,
        [finalDriverId, finalVehicleId, pickupDate, pickupTime, endTime, result.rows[0].id]
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Трансфер успешно создан'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Create transfer error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при создании трансфера'
    } as ApiResponse<null>, { status: 500 });
  }
}
