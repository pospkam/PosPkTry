import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { verifyVehicleOwnership } from '@/lib/auth/transfer-helpers';
import { requireTransferOperator } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/transfer/vehicles/[id]
 * Get vehicle details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireTransferOperator(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult.userId;

    const { id } = await params;
    const isOwner = await verifyVehicleOwnership(userId, id);
    
    if (!isOwner) {
      return NextResponse.json({
        success: false,
        error: 'Транспорт не найден или у вас нет прав'
      } as ApiResponse<null>, { status: 404 });
    }

    // Get vehicle with stats
    const result = await query(
      `SELECT 
        v.*,
        d.id as driver_id,
        d.first_name || ' ' || d.last_name as driver_name,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as completed_trips,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'cancelled') as cancelled_trips,
        COALESCE(SUM(t.price) FILTER (WHERE t.status = 'completed' AND t.payment_status = 'paid'), 0) as total_revenue
      FROM vehicles v
      LEFT JOIN drivers d ON v.id = d.vehicle_id
      LEFT JOIN transfers t ON v.id = t.vehicle_id
      WHERE v.id = $1
      GROUP BY v.id, d.id, d.first_name, d.last_name`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Транспорт не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const vehicle = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        id: vehicle.id,
        name: vehicle.name,
        type: vehicle.type,
        licensePlate: vehicle.license_plate,
        capacity: vehicle.capacity,
        category: vehicle.category,
        status: vehicle.status,
        location: vehicle.location,
        features: vehicle.features,
        images: vehicle.images,
        year: vehicle.year,
        color: vehicle.color,
        mileage: vehicle.mileage,
        fuelType: vehicle.fuel_type,
        vin: vehicle.vin,
        purchaseDate: vehicle.purchase_date,
        lastServiceDate: vehicle.last_service_date,
        nextServiceDate: vehicle.next_service_date,
        notes: vehicle.notes,
        assignedDriver: vehicle.driver_id ? {
          id: vehicle.driver_id,
          name: vehicle.driver_name
        } : null,
        stats: {
          completedTrips: parseInt(vehicle.completed_trips || 0),
          cancelledTrips: parseInt(vehicle.cancelled_trips || 0),
          totalRevenue: parseFloat(vehicle.total_revenue || 0)
        },
        createdAt: vehicle.created_at,
        updatedAt: vehicle.updated_at
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get vehicle error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении транспорта'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * PUT /api/transfer/vehicles/[id]
 * Update vehicle
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireTransferOperator(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult.userId;

    const { id } = await params;
    const isOwner = await verifyVehicleOwnership(userId, id);
    
    if (!isOwner) {
      return NextResponse.json({
        success: false,
        error: 'Транспорт не найден или у вас нет прав'
      } as ApiResponse<null>, { status: 404 });
    }

    const body = await request.json();

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    const allowedFields = [
      'name', 'status', 'location', 'features', 'images',
      'mileage', 'lastServiceDate', 'nextServiceDate', 'notes',
      'year', 'color', 'fuelType'
    ];

    const dbFieldMap: Record<string, string> = {
      licensePlate: 'license_plate',
      fuelType: 'fuel_type',
      lastServiceDate: 'last_service_date',
      nextServiceDate: 'next_service_date'
    };

    for (const [key, value] of Object.entries(body)) {
      const dbKey = dbFieldMap[key] || key.replace(/([A-Z])/g, '_$1').toLowerCase();
      
      if (allowedFields.includes(key)) {
        updateFields.push(`${dbKey} = $${paramIndex++}`);
        
        if (['features', 'images'].includes(key)) {
          updateValues.push(JSON.stringify(value));
        } else {
          updateValues.push(value);
        }
      }
    }

    if (updateFields.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Нет полей для обновления'
      } as ApiResponse<null>, { status: 400 });
    }

    updateValues.push(id);

    const result = await query(
      `UPDATE vehicles 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      updateValues
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Транспорт успешно обновлён'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Update vehicle error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при обновлении транспорта'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * DELETE /api/transfer/vehicles/[id]
 * Delete vehicle
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authResult = await requireTransferOperator(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult.userId;

    const { id } = await params;
    const isOwner = await verifyVehicleOwnership(userId, id);
    
    if (!isOwner) {
      return NextResponse.json({
        success: false,
        error: 'Транспорт не найден или у вас нет прав'
      } as ApiResponse<null>, { status: 404 });
    }

    // Check for active transfers
    const activeTransfers = await query(
      `SELECT COUNT(*) as count FROM transfers 
       WHERE vehicle_id = $1 AND status IN ('pending', 'assigned', 'confirmed', 'in_progress')`,
      [id]
    );

    if (parseInt(activeTransfers.rows[0].count) > 0) {
      return NextResponse.json({
        success: false,
        error: 'Невозможно удалить транспорт с активными трансферами',
        message: 'Сначала завершите или отмените все активные трансферы'
      } as ApiResponse<null>, { status: 400 });
    }

    await query('DELETE FROM vehicles WHERE id = $1', [id]);

    return NextResponse.json({
      success: true,
      message: 'Транспорт успешно удалён'
    } as ApiResponse<null>);

  } catch (error) {
    console.error('Delete vehicle error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при удалении транспорта'
    } as ApiResponse<null>, { status: 500 });
  }
}
