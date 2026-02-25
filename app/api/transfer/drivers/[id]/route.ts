import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { verifyDriverOwnership } from '@/lib/auth/transfer-helpers';
import { requireTransferOperator } from '@/lib/auth/middleware';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const SAFE_DB_COLUMN_REGEX = /^[a-z_][a-z0-9_]*$/;
const DRIVER_STATUSES = ['active', 'inactive', 'suspended', 'on_leave'] as const;

const updateDriverSchema = z.object({
  firstName: z.string().trim().min(1).max(120).optional(),
  lastName: z.string().trim().min(1).max(120).optional(),
  phone: z.string().trim().min(1).max(50).optional(),
  email: z.string().trim().email().optional(),
  status: z.enum(DRIVER_STATUSES).optional(),
  vehicleId: z.union([z.string().trim().min(1), z.null()]).optional(),
  experience: z.coerce.number().int().min(0).max(70).optional(),
  languages: z.array(z.string().trim().min(1).max(50)).max(20).optional(),
  emergencyContact: z.record(z.unknown()).optional(),
  address: z.string().max(500).optional(),
  city: z.string().max(100).optional(),
  notes: z.string().max(5000).optional(),
}).refine(
  (payload) => Object.keys(payload).length > 0,
  { message: 'Нет полей для обновления' }
);

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
        rating: Number.parseFloat(driver.rating ?? '0'),
        avgDriverRating: Number.parseFloat(driver.avg_driver_rating ?? '0'),
        totalTrips: driver.total_trips,
        completedTrips: Number.parseInt(driver.completed_trips ?? '0', 10),
        cancelledTrips: Number.parseInt(driver.cancelled_trips ?? '0', 10),
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
          completedTrips: Number.parseInt(driver.completed_trips ?? '0', 10),
          cancelledTrips: Number.parseInt(driver.cancelled_trips ?? '0', 10),
          totalRevenue: Number.parseFloat(driver.total_revenue ?? '0')
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
    const parsedBody = updateDriverSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({
        success: false,
        error: 'Некорректные данные водителя',
        details: parsedBody.error.flatten(),
      } as ApiResponse<null>, { status: 400 });
    }

    const updateFields: string[] = [];
    const updateValues: unknown[] = [];
    const dbFieldMap: Record<string, string> = {
      firstName: 'first_name',
      lastName: 'last_name',
      vehicleId: 'vehicle_id',
      emergencyContact: 'emergency_contact'
    };

    for (const [key, value] of Object.entries(parsedBody.data)) {
      const dbKey = dbFieldMap[key] || key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (!SAFE_DB_COLUMN_REGEX.test(dbKey)) {
        return NextResponse.json({
          success: false,
          error: 'Некорректное поле обновления'
        } as ApiResponse<null>, { status: 400 });
      }

      updateFields.push(`${dbKey} = $${updateValues.length + 1}`);
      if (key === 'languages' || key === 'emergencyContact') {
        updateValues.push(JSON.stringify(value));
      } else {
        updateValues.push(value);
      }
    }

    const idParamIndex = updateValues.length + 1;
    updateValues.push(id);

    const result = await query(
      `UPDATE drivers 
       SET ${updateFields.join(', ')}
       WHERE id = $${idParamIndex}
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

    if (Number.parseInt(activeTransfers.rows[0]?.count ?? '0', 10) > 0) {
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
