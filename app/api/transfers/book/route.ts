import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { 
  generateBookingReference,
  findAvailableVehicle,
  findAvailableDriver,
  calculateTransferPrice
} from '@/lib/auth/transfer-helpers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/transfers/book
 * Public endpoint to book a transfer
 */
export async function POST(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    
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
      specialRequests
    } = body;

    // Validation
    if (!routeId || !clientName || !clientPhone || !pickupDatetime || !passengers) {
      return NextResponse.json({
        success: false,
        error: 'Заполните обязательные поля'
      } as ApiResponse<null>, { status: 400 });
    }

    // Get route details
    const routeResult = await query(
      `SELECT r.*, p.id as operator_id 
       FROM transfer_routes r
       JOIN partners p ON r.operator_id = p.id
       WHERE r.id = $1 AND r.is_active = true`,
      [routeId]
    );

    if (routeResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Маршрут не найден или недоступен'
      } as ApiResponse<null>, { status: 404 });
    }

    const route = routeResult.rows[0];
    const operatorId = route.operator_id;

    // Calculate price
    const price = await calculateTransferPrice(routeId, passengers, pickupDatetime.split('T')[0]);

    // Find available vehicle and driver
    const pickupDate = pickupDatetime.split('T')[0];
    const pickupTime = pickupDatetime.split('T')[1].substring(0, 5);
    const endTime = new Date(new Date(pickupDatetime).getTime() + (route.estimated_duration || 120) * 60 * 1000)
      .toISOString().split('T')[1].substring(0, 5);

    const vehicleId = await findAvailableVehicle(
      operatorId,
      passengers,
      pickupDate,
      pickupTime,
      endTime
    );

    if (!vehicleId) {
      return NextResponse.json({
        success: false,
        error: 'Нет доступного транспорта на выбранное время',
        message: 'Попробуйте выбрать другое время или свяжитесь с оператором'
      } as ApiResponse<null>, { status: 400 });
    }

    const driverId = await findAvailableDriver(
      operatorId,
      vehicleId,
      pickupDate,
      pickupTime,
      endTime
    );

    // Generate booking reference
    const bookingReference = await generateBookingReference();

    // Create transfer booking
    const result = await query(
      `INSERT INTO transfers (
        booking_reference, operator_id, route_id, client_name, client_phone, client_email,
        pickup_location, dropoff_location, pickup_datetime, passengers, luggage,
        special_requests, price, vehicle_id, driver_id, user_id, status, payment_status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
      RETURNING *`,
      [
        bookingReference,
        operatorId,
        routeId,
        clientName,
        clientPhone,
        clientEmail,
        pickupLocation || route.from_location,
        dropoffLocation || route.to_location,
        pickupDatetime,
        passengers,
        luggage || 0,
        specialRequests,
        price,
        vehicleId,
        driverId,
        userId || null,
        driverId ? 'assigned' : 'pending',
        'pending'
      ]
    );

    // Create driver schedule if driver assigned
    if (driverId && vehicleId) {
      await query(
        `INSERT INTO driver_schedules (driver_id, vehicle_id, date, start_time, end_time, transfer_id, type)
         VALUES ($1, $2, $3, $4, $5, $6, 'booked')
         ON CONFLICT (driver_id, date, start_time) DO NOTHING`,
        [driverId, vehicleId, pickupDate, pickupTime, endTime, result.rows[0].id]
      );
    }

    // Send notification to operator (if notifications system is set up)
    try {
      await query(
        `INSERT INTO notifications (user_id, type, title, message, data, priority)
         SELECT p.user_id, 'transfer_new', 'Новое бронирование трансфера', 
                'Бронирование ' || $1 || ' от ' || $2, 
                jsonb_build_object('transferId', $3, 'bookingReference', $1),
                'high'
         FROM partners p
         WHERE p.id = $4`,
        [bookingReference, clientName, result.rows[0].id, operatorId]
      );
    } catch (notifError) {
      console.error('Notification error:', notifError);
      // Don't fail the booking if notification fails
    }

    return NextResponse.json({
      success: true,
      data: {
        id: result.rows[0].id,
        bookingReference,
        status: result.rows[0].status,
        price,
        pickupDatetime,
        estimatedDuration: route.estimated_duration
      },
      message: 'Трансфер успешно забронирован'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Book transfer error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при бронировании трансфера'
    } as ApiResponse<null>, { status: 500 });
  }
}
