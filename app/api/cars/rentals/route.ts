import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAuth } from '@/lib/auth/middleware';
import { 
  checkCarAvailability, 
  calculateRentalCost, 
  validateRentalData,
  validateDriverLicense
} from '@/lib/auth/cars-helpers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cars/rentals - Create car rental booking
 */
export async function POST(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const body = await request.json();
    const {
      carId,
      customerName,
      customerEmail,
      customerPhone,
      driverLicenseNumber,
      driverLicenseIssueDate,
      driverLicenseExpiryDate,
      driverBirthDate,
      additionalDriverName,
      additionalDriverLicense,
      startDate,
      endDate,
      pickupLocation,
      returnLocation,
      includesGPS,
      includesChildSeat,
      includesInsurance,
      notes
    } = body;

    // Validate rental data
    const validation = validateRentalData({
      startDate,
      endDate,
      carId,
      customerName,
      customerEmail,
      customerPhone,
      driverLicenseNumber
    });

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.errors.join(', ') } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Validate driver license
    const licenseValidation = validateDriverLicense({
      licenseNumber: driverLicenseNumber,
      issueDate: driverLicenseIssueDate,
      expiryDate: driverLicenseExpiryDate,
      birthDate: driverBirthDate,
      rentalStartDate: startDate
    });

    if (!licenseValidation.valid) {
      return NextResponse.json(
        { success: false, error: licenseValidation.errors.join(', ') } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Get car details and partner_id
    const carResult = await query(
      `SELECT partner_id, is_active, min_driver_age FROM cars WHERE id = $1`,
      [carId]
    );

    if (carResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Автомобиль не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const car = carResult.rows[0];

    if (!car.is_active) {
      return NextResponse.json(
        { success: false, error: 'Автомобиль недоступен для аренды' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Check availability for date range
    const availability = await checkCarAvailability(carId, startDate, endDate);
    if (!availability.available) {
      return NextResponse.json(
        { success: false, error: 'Автомобиль недоступен на выбранные даты' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Calculate costs
    const start = new Date(startDate);
    const end = new Date(endDate);
    const totalDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));

    const costs = await calculateRentalCost(
      carId,
      totalDays,
      includesInsurance,
      includesGPS,
      includesChildSeat,
      !!additionalDriverName
    );

    // Create rental
    const result = await query(
      `INSERT INTO car_rentals (
        partner_id, car_id, user_id,
        customer_name, customer_email, customer_phone,
        driver_license_number, driver_license_issue_date, driver_license_expiry_date, driver_birth_date,
        additional_driver_name, additional_driver_license,
        start_date, end_date, total_days,
        pickup_location, return_location,
        rental_cost, deposit_amount, insurance_cost,
        additional_driver_cost, gps_cost, child_seat_cost, total_amount,
        includes_gps, includes_child_seat,
        notes, status
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
        $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
        $21, $22, $23, $24, $25, $26, $27, 'pending'
      ) RETURNING id, rental_number`,
      [
        car.partner_id, carId, userOrResponse.userId,
        customerName, customerEmail, customerPhone,
        driverLicenseNumber, driverLicenseIssueDate || null, driverLicenseExpiryDate, driverBirthDate,
        additionalDriverName || null, additionalDriverLicense || null,
        startDate, endDate, totalDays,
        pickupLocation, returnLocation,
        costs.rentalCost, costs.depositAmount, costs.insuranceCost,
        costs.extrasCost, includesGPS ? (totalDays * 300) : 0, includesChildSeat ? (totalDays * 200) : 0, costs.totalCost,
        includesGPS, includesChildSeat,
        notes || null
      ]
    );

    return NextResponse.json({
      success: true,
      data: {
        rentalId: result.rows[0].id,
        rentalNumber: result.rows[0].rental_number,
        costs,
        message: 'Заявка на аренду создана'
      }
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error creating car rental:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка создания заявки' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

/**
 * GET /api/cars/rentals - Get user's car rentals
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    let queryText = `
      SELECT
        cr.id,
        cr.rental_number,
        cr.customer_name,
        cr.start_date,
        cr.end_date,
        cr.total_days,
        cr.pickup_location,
        cr.return_location,
        cr.total_amount,
        cr.deposit_amount,
        cr.deposit_paid,
        cr.status,
        cr.payment_status,
        cr.created_at,
        c.brand,
        c.model,
        c.year,
        c.license_plate,
        c.images
      FROM car_rentals cr
      JOIN cars c ON cr.car_id = c.id
      WHERE cr.user_id = $1
    `;

    const params: any[] = [userOrResponse.userId];
    let paramIndex = 2;

    if (status) {
      queryText += ` AND cr.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    queryText += ` ORDER BY cr.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(queryText, params);

    return NextResponse.json({
      success: true,
      data: {
        rentals: result.rows,
        pagination: {
          total: result.rows.length,
          limit,
          offset
        }
      }
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error fetching car rentals:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка получения аренд' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
