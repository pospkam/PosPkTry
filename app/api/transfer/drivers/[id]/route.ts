import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { verifyDriverOwnership } from '@/lib/auth/transfer-helpers';
import { requireTransferOperator } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/transfer/drivers/[id]
 * Get driver details
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
    const isOwner = await verifyDriverOwnership(userId, id);
    
    if (!isOwner) {
      return NextResponse.json({
        success: false,
        error: 'Водитель не найден или у вас нет прав'
      } as ApiResponse<null>, { status: 404 });
    }

    const result = await query(
      `SELECT 
        d.*,
        v.name as vehicle_name,
        v.license_plate as vehicle_plate,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'completed') as completed_trips,
        COUNT(DISTINCT t.id) FILTER (WHERE t.status = 'cancelled') as cancelled_trips,
        COALESCE(SUM(t.price) FILTER (WHERE t.status = 'completed' AND t.payment_status = 'paid'), 0) as total_revenue,
        COALESCE(AVG(tr.driver_rating), 0) as avg_driver_rating
      FROM drivers d
      LEFT JOIN vehicles v ON d.vehicle_id = v.id
      LEFT JOIN transfers t ON d.id = t.driver_id
      LEFT JOIN transfer_reviews tr ON d.id = tr.driver_id
      WHERE d.id = $1
      GROUP BY d.id, v.name, v.license_plate`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Водитель не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const driver = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        id: driver.id,
        firstName: driver.first_name,
        lastName: driver.last_name,
        phone: driver.phone,
        email: driver.email,
        dateOfBirth: driver.date_of_birth,
        licenseNumber: driver.license_number,
        licenseCategory: driver.license_category,
        licenseIssueDate: driver.license_issue_date,
        licenseExpiry: driver.license_expiry,
        experience: driver.experience,
        languages: driver.languages,
        rating: parseFloat(driver.rating),
        avgDriverRating: parseFloat(driver.avg_driver_rating),
        totalTrips: driver.total_trips,
        completedTrips: parseInt(driver.completed_trips_count || 0),
        cancelledTrips: parseInt(driver.cancelled_trips_count || 0),
        status: driver.status,
        vehicle: driver.vehicle_id ? {
          id: driver.vehicle_id,
          name: driver.vehicle_name,
          plate: driver.vehicle_plate
        } : null,
        emergencyContact: driver.emergency_contact,
        address: driver.address,
        city: driver.city,
        hireDate: driver.hire_date,
        notes: driver.notes,
        stats: {
          completedTrips: parseInt(driver.completed_trips || 0),
          cancelledTrips: parseInt(driver.cancelled_trips || 0),
          totalRevenue: parseFloat(driver.total_revenue || 0)
        },
        createdAt: driver.created_at,
        updatedAt: driver.updated_at
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get driver error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении водителя'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * PUT /api/transfer/drivers/[id]
 * Update driver
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
    const isOwner = await verifyDriverOwnership(userId, id);
    
    if (!isOwner) {
      return NextResponse.json({
        success: false,
        error: 'Водитель не найден или у вас нет прав'
      } as ApiResponse<null>, { status: 404 });
    }

    const body = await request.json();

    const updateFields = [];
    const updateValues = [];
    let paramIndex = 1;

    const allowedFields = [
      'firstName', 'lastName', 'phone', 'email', 'status', 'vehicleId',
      'experience', 'languages', 'emergencyContact', 'address', 'city', 'notes'
    ];

    const dbFieldMap: Record<string, string> = {
      firstName: 'first_name',
      lastName: 'last_name',
      vehicleId: 'vehicle_id',
      emergencyContact: 'emergency_contact'
    };

    for (const [key, value] of Object.entries(body)) {
      if (allowedFields.includes(key)) {
        const dbKey = dbFieldMap[key] || key.replace(/([A-Z])/g, '_$1').toLowerCase();
        updateFields.push(`${dbKey} = $${paramIndex++}`);
        
        if (['languages', 'emergencyContact'].includes(key)) {
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
      `UPDATE drivers 
       SET ${updateFields.join(', ')}
       WHERE id = $${paramIndex}
       RETURNING *`,
      updateValues
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Водитель успешно обновлён'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Update driver error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при обновлении водителя'
    } as ApiResponse<null>, { status: 500 });
    }
}

/**
 * DELETE /api/transfer/drivers/[id]
 * Delete driver
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
    const isOwner = await verifyDriverOwnership(userId, id);
    
    if (!isOwner) {
      return NextResponse.json({
        success: false,
        error: 'Водитель не найден или у вас нет прав'
      } as ApiResponse<null>, { status: 404 });
    }

    // Check for active transfers
    const activeTransfers = await query(
      `SELECT COUNT(*) as count FROM transfers 
       WHERE driver_id = $1 AND status IN ('pending', 'assigned', 'confirmed', 'in_progress')`,
      [id]
    );

    if (parseInt(activeTransfers.rows[0].count) > 0) {
      return NextResponse.json({
        success: false,
        error: 'Невозможно удалить водителя с активными трансферами'
      } as ApiResponse<null>, { status: 400 });
    }

    await query('DELETE FROM drivers WHERE id = $1', [id]);

    return NextResponse.json({
      success: true,
      message: 'Водитель успешно удалён'
    } as ApiResponse<null>);

  } catch (error) {
    console.error('Delete driver error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при удалении водителя'
    } as ApiResponse<null>, { status: 500 });
  }
}
