import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAuth } from '@/lib/auth/middleware';
import { getCarsPartnerId, ensureCarsPartnerExists } from '@/lib/auth/cars-helpers';

export const dynamic = 'force-dynamic';

const CreateCarSchema = z.object({
  brand: z.string().min(1, 'Марка обязательна'),
  model: z.string().min(1, 'Модель обязательна'),
  year: z.number().int().positive('Год должен быть положительным'),
  vin: z.string().optional(),
  licensePlate: z.string().min(1, 'Номер пластины обязателен'),
  category: z.enum(['economy', 'comfort', 'business', 'suv', 'luxury', 'minivan'], { errorMap: () => ({ message: 'Некорректная категория' }) }),
  bodyType: z.string().optional(),
  transmission: z.enum(['manual', 'automatic', 'robot', 'cvt'], { errorMap: () => ({ message: 'Некорректный тип КПП' }) }),
  fuelType: z.enum(['petrol', 'diesel', 'hybrid', 'electric', 'gas'], { errorMap: () => ({ message: 'Некорректный тип топлива' }) }),
  engineVolume: z.number().optional(),
  power: z.number().optional(),
  driveType: z.string().optional(),
  seats: z.number().int().min(2).max(9, 'Количество мест должно быть от 2 до 9'),
  doors: z.number().optional(),
  color: z.string().optional(),
  mileage: z.number().optional(),
  pricePerDay: z.number().positive('Цена за день должна быть положительной'),
  pricePerWeek: z.number().optional(),
  pricePerMonth: z.number().optional(),
  images: z.array(z.string()).optional(),
  features: z.array(z.string()).optional(),
  specifications: z.record(z.unknown()).optional(),
  condition: z.string().optional(),
  depositAmount: z.number().min(0, 'Залог не может быть отрицательным'),
  minDriverAge: z.number().optional(),
  minDriverExperience: z.number().optional(),
  insuranceIncluded: z.boolean().optional(),
  insuranceDailyCost: z.number().optional(),
  mileageLimitPerDay: z.number().optional(),
  extraMileageCost: z.number().optional(),
  locationAddress: z.string().optional(),
  pickupInstructions: z.string().optional(),
  returnInstructions: z.string().optional(),
  restrictions: z.string().optional(),
  quantity: z.number().optional(),
});

/**
 * GET /api/cars/items - Get all cars for the partner
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const partnerId = await getCarsPartnerId(userOrResponse.userId);
    if (!partnerId) {
      return NextResponse.json(
        { success: false, error: 'Партнер категории cars не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // 'active', 'inactive', 'all'
    const category = searchParams.get('category');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let queryText = `
      SELECT 
        c.*,
        (SELECT COUNT(*) FROM car_rentals WHERE car_id = c.id AND status = 'active') as active_rentals,
        (SELECT COUNT(*) FROM car_rentals WHERE car_id = c.id AND status = 'confirmed') as upcoming_rentals
      FROM cars c
      WHERE c.partner_id = $1
    `;

    const params: unknown[] = [partnerId];
    let paramIndex = 2;

    if (status === 'active') {
      queryText += ` AND c.is_active = TRUE`;
    } else if (status === 'inactive') {
      queryText += ` AND c.is_active = FALSE`;
    }

    if (category) {
      queryText += ` AND c.category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    queryText += ` ORDER BY c.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(queryText, params);

    // Get total count
    const countResult = await query<{ count: string }>(
      `SELECT COUNT(*) FROM cars WHERE partner_id = $1`,
      [partnerId]
    );

    return NextResponse.json({
      success: true,
      data: {
        cars: result.rows,
        pagination: {
          total: parseInt(countResult.rows[0].count),
          limit,
          offset,
          hasMore: offset + limit < parseInt(countResult.rows[0].count)
        }
      }
    } as ApiResponse<unknown>);
  } catch (error) {
    console.error('Error fetching cars:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении автомобилей' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

/**
 * POST /api/cars/items - Create new car
 */
export async function POST(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const partnerId = await ensureCarsPartnerExists(userOrResponse.userId);

    const body = await request.json();
    const parsed = CreateCarSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const {
      brand,
      model,
      year,
      vin,
      licensePlate,
      category,
      bodyType,
      transmission,
      fuelType,
      engineVolume,
      power,
      driveType,
      seats,
      doors,
      color,
      mileage,
      pricePerDay,
      pricePerWeek,
      pricePerMonth,
      images,
      features,
      specifications,
      condition,
      depositAmount,
      minDriverAge,
      minDriverExperience,
      insuranceIncluded,
      insuranceDailyCost,
      mileageLimitPerDay,
      extraMileageCost,
      locationAddress,
      pickupInstructions,
      returnInstructions,
      restrictions,
      quantity
    } = parsed.data;

    // Check for duplicate license plate
    const duplicateCheck = await query(
      `SELECT id FROM cars WHERE license_plate = $1 AND id != $2`,
      [licensePlate, '00000000-0000-0000-0000-000000000000']
    );

    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Автомобиль с таким номером уже существует' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO cars (
        partner_id, brand, model, year, vin, license_plate,
        category, body_type, transmission, fuel_type,
        engine_volume, power, drive_type, seats, doors, color, mileage,
        price_per_day, price_per_week, price_per_month,
        images, features, specifications, condition,
        deposit_amount, min_driver_age, min_driver_experience,
        insurance_included, insurance_daily_cost,
        mileage_limit_per_day, extra_mileage_cost,
        location_address, pickup_instructions, return_instructions, restrictions,
        quantity, available_quantity
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, $28, $29, $30,
        $31, $32, $33, $34, $35, $36, $36
      ) RETURNING *`,
      [
        partnerId, brand, model, year, vin || null, licensePlate,
        category, bodyType || null, transmission, fuelType,
        engineVolume || null, power || null, driveType || null, seats, doors || 4, color || null, mileage || 0,
        pricePerDay, pricePerWeek || null, pricePerMonth || null,
        JSON.stringify(images || []), JSON.stringify(features || []), JSON.stringify(specifications || {}), condition || 'excellent',
        depositAmount, minDriverAge || 21, minDriverExperience || 2,
        insuranceIncluded !== false, insuranceDailyCost || 0,
        mileageLimitPerDay || null, extraMileageCost || null,
        locationAddress || null, pickupInstructions || null, returnInstructions || null, restrictions || null,
        quantity || 1
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    } as ApiResponse<unknown>);
  } catch (error) {
    console.error('Error creating car:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при создании автомобиля' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
