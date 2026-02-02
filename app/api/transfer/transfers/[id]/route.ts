import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { verifyTransferOwnership } from '@/lib/auth/transfer-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/transfer/transfers/[id]
 * Get transfer details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'transfer') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    const isOwner = await verifyTransferOwnership(userId, params.id);
    
    if (!isOwner) {
      return NextResponse.json({
        success: false,
        error: 'Трансфер не найден или у вас нет прав'
      } as ApiResponse<null>, { status: 404 });
    }

    const result = await query(
      `SELECT 
        t.*,
        v.name as vehicle_name,
        v.license_plate as vehicle_plate,
        v.type as vehicle_type,
        d.first_name || ' ' || d.last_name as driver_name,
        d.phone as driver_phone,
        d.rating as driver_rating,
        r.name as route_name,
        r.distance as route_distance,
        r.estimated_duration as route_duration,
        u.email as user_email
      FROM transfers t
      LEFT JOIN vehicles v ON t.vehicle_id = v.id
      LEFT JOIN drivers d ON t.driver_id = d.id
      LEFT JOIN transfer_routes r ON t.route_id = r.id
      LEFT JOIN users u ON t.user_id = u.id
      WHERE t.id = $1`,
      [params.id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Трансфер не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const transfer = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        id: transfer.id,
        bookingReference: transfer.booking_reference,
        clientName: transfer.client_name,
        clientPhone: transfer.client_phone,
        clientEmail: transfer.client_email,
        userEmail: transfer.user_email,
        pickupLocation: transfer.pickup_location,
        dropoffLocation: transfer.dropoff_location,
        pickupDatetime: transfer.pickup_datetime,
        dropoffDatetime: transfer.dropoff_datetime,
        actualPickupTime: transfer.actual_pickup_time,
        actualDropoffTime: transfer.actual_dropoff_time,
        passengers: transfer.passengers,
        luggage: transfer.luggage,
        price: parseFloat(transfer.price),
        status: transfer.status,
        paymentStatus: transfer.payment_status,
        paymentMethod: transfer.payment_method,
        vehicle: transfer.vehicle_id ? {
          id: transfer.vehicle_id,
          name: transfer.vehicle_name,
          plate: transfer.vehicle_plate,
          type: transfer.vehicle_type
        } : null,
        driver: transfer.driver_id ? {
          id: transfer.driver_id,
          name: transfer.driver_name,
          phone: transfer.driver_phone,
          rating: parseFloat(transfer.driver_rating)
        } : null,
        route: transfer.route_id ? {
          id: transfer.route_id,
          name: transfer.route_name,
          distance: parseFloat(transfer.route_distance),
          estimatedDuration: transfer.route_duration
        } : null,
        specialRequests: transfer.special_requests,
        notes: transfer.notes,
        actualDistance: transfer.actual_distance,
        actualDuration: transfer.actual_duration,
        rating: transfer.rating,
        feedback: transfer.feedback,
        cancellationReason: transfer.cancellation_reason,
        cancelledBy: transfer.cancelled_by,
        cancelledAt: transfer.cancelled_at,
        assignedAt: transfer.assigned_at,
        confirmedAt: transfer.confirmed_at,
        completedAt: transfer.completed_at,
        createdAt: transfer.created_at,
        updatedAt: transfer.updated_at
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get transfer error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении трансфера'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * PUT /api/transfer/transfers/[id]
 * Update transfer
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'transfer') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    const isOwner = await verifyTransferOwnership(userId, params.id);
    
    if (!isOwner) {
      return NextResponse.json({
        success: false,
        error: 'Трансфер не найден или у вас нет прав'
      } as ApiResponse<null>, { status: 404 });
    }

    const body = await request.json();

    // Special handling for status changes
    const allowedStatusTransitions: Record<string, string[]> = {
      'pending': ['assigned', 'cancelled'],
      'assigned': ['confirmed', 'in_progress', 'cancelled'],
      'confirmed': ['in_progress', 'cancelled'],
      'in_progress': ['completed', 'delayed'],
      'delayed': ['completed', 'cancelled']
    };

    if (body.status) {
      const currentResult = await query(
        'SELECT status FROM transfers WHERE id = $1',
        [params.id]
      );
      
      const currentStatus = currentResult.rows[0]?.status;
      const allowedTransitions = allowedStatusTransitions[currentStatus] || [];

      if (!allowedTransitions.includes(body.status)) {
        return NextResponse.json({
          success: false,
          error: `Недопустимый переход статуса: ${currentStatus} → ${body.status}`
        } as ApiResponse<null>, { status: 400 });
      }

      // Add timestamp fields for status changes
      if (body.status === 'assigned') {
        body.assignedAt = new Date().toISOString();
      } else if (body.status === 'confirmed') {
        body.confirmedAt = new Date().toISOString();
      } else if (body.status === 'completed') {
        body.completedAt = new Date().toISOString();
      } else if (body.status === 'cancelled') {
        body.cancelledAt = new Date().toISOString();
        body.cancelledBy = 'operator';
      }

      // Handle actual times
      if (body.status === 'in_progress' && !body.actualPickupTime) {
        body.actualPickupTime = new Date().toISOString();
      }
      if (body.status === 'completed' && !body.actualDropoffTime) {
        body.actualDropoffTime = new Date().toISOString();
      }
    }

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    const allowedFields = [
      'status', 'paymentStatus', 'vehicleId', 'driverId', 'notes',
      'actualPickupTime', 'actualDropoffTime', 'actualDistance', 'actualDuration',
      'assignedAt', 'confirmedAt', 'completedAt', 'cancelledAt', 'cancelledBy',
      'cancellationReason'
    ];

    const dbFieldMap: Record<string, string> = {
      paymentStatus: 'payment_status',
      vehicleId: 'vehicle_id',
      driverId: 'driver_id',
      actualPickupTime: 'actual_pickup_time',
      actualDropoffTime: 'actual_dropoff_time',
      actualDistance: 'actual_distance',
      actualDuration: 'actual_duration',
      assignedAt: 'assigned_at',
      confirmedAt: 'confirmed_at',
      completedAt: 'completed_at',
      cancelledAt: 'cancelled_at',
      cancelledBy: 'cancelled_by',
      cancellationReason: 'cancellation_reason'
    };

    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        const dbKey = dbFieldMap[key] || key.replace(/([A-Z])/g, '_$1').toLowerCase();
        updateFields.push(`${dbKey} = $${paramIndex++}`);
        updateValues.push(value);
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Нет полей для обновления'
      } as ApiResponse<null>, { status: 400 });
    }

    updateValues.push(params.id);

    const result = await query(
      `UPDATE transfers 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      updateValues
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Трансфер успешно обновлён'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Update transfer error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при обновлении трансфера'
    } as ApiResponse<null>, { status: 500 });
  }
}
