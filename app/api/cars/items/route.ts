import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAuth } from '@/lib/auth/middleware';
import { getCarsPartnerId, ensureCarsPartnerExists } from '@/lib/auth/cars-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cars/items - Get all cars for the partner
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const partnerId = await getCarsPartnerId(userOrResponse.id);
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

    const params: any[] = [partnerId];
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
    const countResult = await query(
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
    } as ApiResponse<any>);
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

    const partnerId = await ensureCarsPartnerExists(userOrResponse.id);

    const body = await request.json();
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
    } = body;

    // Validation
    if (!brand || !model || !year || !licensePlate) {
      return NextResponse.json(
        { success: false, error: 'Укажите обязательные поля: марка, модель, год, номер' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    if (!category || !['economy', 'comfort', 'business', 'suv', 'luxury', 'minivan'].includes(category)) {
      return NextResponse.json(
        { success: false, error: 'Укажите корректную категорию' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    if (!transmission || !['manual', 'automatic', 'robot', 'cvt'].includes(transmission)) {
      return NextResponse.json(
        { success: false, error: 'Укажите корректный тип КПП' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    if (!fuelType || !['petrol', 'diesel', 'hybrid', 'electric', 'gas'].includes(fuelType)) {
      return NextResponse.json(
        { success: false, error: 'Укажите корректный тип топлива' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    if (!seats || seats < 2 || seats > 9) {
      return NextResponse.json(
        { success: false, error: 'Количество мест должно быть от 2 до 9' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    if (!pricePerDay || pricePerDay <= 0) {
      return NextResponse.json(
        { success: false, error: 'Укажите корректную цену за день' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    if (!depositAmount || depositAmount < 0) {
      return NextResponse.json(
        { success: false, error: 'Укажите корректный размер залога' } as ApiResponse<null>,
        { status: 400 }
      );
    }

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
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error creating car:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при создании автомобиля' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
