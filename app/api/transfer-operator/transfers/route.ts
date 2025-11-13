import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse, Transfer, TransferFormData } from '@/types';
import { requireTransferOperator } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/transfer-operator/transfers - Получить список трансферов
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireTransferOperator(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;
    
    const operatorId = userOrResponse.userId;

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || 'all';
    const driverId = searchParams.get('driverId');
    const vehicleId = searchParams.get('vehicleId');
    const limit = parseInt(searchParams.get('limit') || '50');

    let whereClause = 'WHERE t.operator_id = $1';
    const params = [operatorId];

    if (status !== 'all') {
      whereClause += ` AND t.status = $${params.length + 1}`;
      params.push(status);
    }

    if (driverId) {
      whereClause += ` AND t.driver_id = $${params.length + 1}`;
      params.push(driverId);
    }

    if (vehicleId) {
      whereClause += ` AND t.vehicle_id = $${params.length + 1}`;
      params.push(vehicleId);
    }

    const transfersQuery = `
      SELECT
        t.id,
        t.booking_id,
        t.client_name,
        t.client_phone,
        t.client_email,
        t.vehicle_id,
        v.name as vehicle_name,
        t.driver_id,
        CONCAT(d.first_name, ' ', d.last_name) as driver_name,
        t.pickup_location,
        t.dropoff_location,
        t.pickup_date_time,
        t.dropoff_date_time,
        t.passengers,
        t.luggage,
        t.special_requests,
        t.price,
        t.status,
        t.payment_status,
        t.notes,
        t.actual_pickup_time,
        t.actual_dropoff_time,
        t.distance,
        t.duration,
        t.rating,
        t.feedback,
        t.created_at,
        t.updated_at
      FROM transfers t
      JOIN vehicles v ON t.vehicle_id = v.id
      JOIN drivers d ON t.driver_id = d.id
      ${whereClause}
      ORDER BY t.pickup_date_time DESC
      LIMIT $${params.length + 1}
    `;

    params.push(limit);
    const transfersResult = await query(transfersQuery, params);

    const transfers: Transfer[] = transfersResult.rows.map(row => ({
      id: row.id,
      bookingId: row.booking_id,
      clientName: row.client_name,
      clientPhone: row.client_phone,
      clientEmail: row.client_email,
      vehicleId: row.vehicle_id,
      vehicleName: row.vehicle_name,
      driverId: row.driver_id,
      driverName: row.driver_name,
      pickupLocation: row.pickup_location,
      dropoffLocation: row.dropoff_location,
      pickupDateTime: row.pickup_date_time,
      dropoffDateTime: row.dropoff_date_time,
      passengers: row.passengers,
      luggage: row.luggage,
      specialRequests: row.special_requests,
      price: parseFloat(row.price),
      status: row.status,
      paymentStatus: row.payment_status,
      notes: row.notes,
      actualPickupTime: row.actual_pickup_time,
      actualDropoffTime: row.actual_dropoff_time,
      distance: row.distance ? parseFloat(row.distance) : undefined,
      duration: row.duration ? parseInt(row.duration) : undefined,
      rating: row.rating ? parseFloat(row.rating) : undefined,
      feedback: row.feedback,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    return NextResponse.json({
      success: true,
      data: {
        transfers,
        total: transfers.length
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error fetching transfers:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении списка трансферов'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/transfer-operator/transfers - Создать новый трансфер
 */
export async function POST(request: NextRequest) {
  try {
    const userOrResponse = await requireTransferOperator(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;
    
    const operatorId = userOrResponse.userId;

    const body: TransferFormData = await request.json();
    const {
      bookingId,
      clientName,
      clientPhone,
      clientEmail,
      vehicleId,
      driverId,
      pickupLocation,
      dropoffLocation,
      pickupDateTime,
      passengers,
      luggage,
      specialRequests,
      price,
      notes
    } = body;

    if (!clientName || !clientPhone || !vehicleId || !driverId || !pickupLocation || !dropoffLocation || !pickupDateTime || !passengers || !price) {
      return NextResponse.json({
        success: false,
        error: 'Необходимо указать все обязательные поля: клиента, транспорт, водителя, маршрут, время, пассажиров и цену'
      } as ApiResponse<null>, { status: 400 });
    }

    // Проверяем доступность водителя и ТС на указанное время
    // TODO: Добавить проверку расписания

    // Создаем трансфер
    const transferId = `transfer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const createTransferQuery = `
      INSERT INTO transfers (
        id,
        operator_id,
        booking_id,
        client_name,
        client_phone,
        client_email,
        vehicle_id,
        driver_id,
        pickup_location,
        dropoff_location,
        pickup_date_time,
        passengers,
        luggage,
        special_requests,
        price,
        status,
        payment_status,
        notes,
        created_at,
        updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW(), NOW()
      )
      RETURNING id, created_at
    `;

    const transferResult = await query(createTransferQuery, [
      transferId,
      operatorId,
      bookingId || null,
      clientName,
      clientPhone,
      clientEmail || null,
      vehicleId,
      driverId,
      pickupLocation,
      dropoffLocation,
      pickupDateTime,
      passengers,
      luggage || 0,
      specialRequests || null,
      price,
      'scheduled', // status
      'pending', // payment_status
      notes || null
    ]);

    // Обновляем статистику водителя
    await query(`
      UPDATE drivers
      SET total_trips = total_trips + 1, updated_at = NOW()
      WHERE id = $1
    `, [driverId]);

    const newTransfer = transferResult.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        transferId: newTransfer.id,
        createdAt: newTransfer.created_at
      },
      message: 'Трансфер успешно создан'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error creating transfer:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при создании трансфера'
    } as ApiResponse<null>, { status: 500 });
  }
}
