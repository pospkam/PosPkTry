import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { getTransferPartnerId } from '@/lib/auth/transfer-helpers';
import { requireTransferOperator } from '@/lib/auth/middleware';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const DRIVER_STATUSES = ['active', 'inactive', 'suspended', 'on_leave'] as const;

const listDriversQuerySchema = z.object({
  status: z.enum(['all', ...DRIVER_STATUSES] as const).default('all'),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
});

const createDriverSchema = z.object({
  firstName: z.string().trim().min(1).max(120),
  lastName: z.string().trim().min(1).max(120),
  phone: z.string().trim().min(1).max(50),
  email: z.string().trim().email().optional(),
  licenseNumber: z.string().trim().min(1).max(100),
  licenseExpiry: z.string().trim().min(1),
  experience: z.coerce.number().int().min(0).max(70).optional().default(0),
  languages: z.array(z.string().trim().min(1).max(50)).max(20).optional().default([]),
  vehicleId: z.string().trim().min(1).optional(),
  emergencyContact: z.record(z.unknown()).optional().default({}),
}).superRefine((payload, ctx) => {
  const parsed = new Date(payload.licenseExpiry);
  if (Number.isNaN(parsed.getTime())) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['licenseExpiry'],
      message: 'Некорректная дата окончания лицензии',
    });
  }
});

function paramOrUndefined(searchParams: URLSearchParams, key: string): string | undefined {
  const value = searchParams.get(key);
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

/**
 * GET /api/transfer/drivers
 * Get transfer operator's drivers
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
    const parsedQuery = listDriversQuerySchema.safeParse({
      status: paramOrUndefined(searchParams, 'status'),
      page: paramOrUndefined(searchParams, 'page'),
      limit: paramOrUndefined(searchParams, 'limit'),
    });

    if (!parsedQuery.success) {
      return NextResponse.json({
        success: false,
        error: 'Некорректные параметры запроса',
        details: parsedQuery.error.flatten(),
      } as ApiResponse<null>, { status: 400 });
    }

    const { status, page, limit } = parsedQuery.data;
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

    const params: unknown[] = [operatorId];
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
      rating: Number.parseFloat(row.rating ?? '0'),
      totalTrips: row.total_trips,
      completedTrips: Number.parseInt(row.completed_trips ?? '0', 10),
      activeTrips: Number.parseInt(row.active_trips ?? '0', 10),
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
    const parsedBody = createDriverSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({
        success: false,
        error: 'Некорректные данные водителя',
        details: parsedBody.error.flatten(),
      } as ApiResponse<null>, { status: 400 });
    }

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
    } = parsedBody.data;

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
        experience,
        JSON.stringify(languages),
        vehicleId,
        JSON.stringify(emergencyContact)
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
