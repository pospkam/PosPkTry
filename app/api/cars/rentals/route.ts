import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * POST /api/cars/rentals - Создание заявки на аренду автомобиля
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
      carName,
      customer,
      rental,
      pricing,
      comments
    } = body;

    // Валидация данных
    if (!customer?.name || !customer?.email || !customer?.phone || !customer?.driverLicense) {
      return NextResponse.json(
        { success: false, error: 'Необходимо указать полные контактные данные и номер ВУ' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    if (!rental?.startDate || !rental?.endDate) {
      return NextResponse.json(
        { success: false, error: 'Необходимо указать даты аренды' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Проверяем доступность автомобиля
    const availabilityCheck = await query(`
      SELECT is_available FROM cars WHERE id = $1
    `, [carId]);

    if (availabilityCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Автомобиль не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    if (!availabilityCheck.rows[0].is_available) {
      return NextResponse.json(
        { success: false, error: 'Автомобиль недоступен для аренды' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Создаем заявку на аренду автомобиля
    const result = await query(`
      INSERT INTO car_rentals (
        id, car_id, customer_name, customer_email, customer_phone, driver_license,
        start_date, end_date, days_count, pickup_location, return_location,
        insurance_type, additional_drivers, gps, child_seat,
        rental_price, insurance_cost, additional_drivers_cost, gps_cost, child_seat_cost,
        deposit, total_price, comments, status, created_at
      ) VALUES (
        gen_random_uuid(),
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14,
        $15, $16, $17, $18, $19, $20, $21, $22, 'pending', NOW()
      ) RETURNING id
    `, [
      carId,
      customer.name,
      customer.email,
      customer.phone,
      customer.driverLicense,
      rental.startDate,
      rental.endDate,
      rental.days,
      rental.pickupLocation,
      rental.returnLocation,
      rental.insurance,
      rental.additionalDrivers,
      rental.gps,
      rental.childSeat,
      pricing.rentalPrice,
      pricing.insuranceCost,
      pricing.additionalDriversCost,
      pricing.gpsCost,
      pricing.childSeatCost,
      pricing.deposit,
      pricing.totalPrice,
      comments || null
    ]);

    const rentalId = result.rows[0].id;

    return NextResponse.json({
      success: true,
      data: {
        rentalId,
        message: 'Заявка на аренду автомобиля создана успешно'
      }
    } as ApiResponse<{ rentalId: string; message: string }>);

  } catch (error) {
    console.error('Error creating car rental:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка создания заявки на аренду автомобиля' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

/**
 * GET /api/cars/rentals - Получение списка заявок на аренду автомобилей
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

    let queryText = `
      SELECT
        cr.id,
        cr.customer_name,
        cr.customer_email,
        cr.customer_phone,
        cr.start_date,
        cr.end_date,
        cr.days_count,
        cr.pickup_location,
        cr.return_location,
        cr.insurance_type,
        cr.total_price,
        cr.status,
        cr.created_at,
        c.brand,
        c.model,
        c.year
      FROM car_rentals cr
      JOIN cars c ON cr.car_id = c.id
    `;

    const params: any[] = [];
    const whereConditions: string[] = [];

    // Фильтр по статусу
    if (status) {
      whereConditions.push(`cr.status = $${params.length + 1}`);
      params.push(status);
    }

    if (whereConditions.length > 0) {
      queryText += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    queryText += ` ORDER BY cr.created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await query(queryText, params);

    return NextResponse.json({
      success: true,
      data: {
        rentals: result.rows,
        count: result.rows.length
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Error fetching car rentals:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка получения заявок на аренду автомобилей' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
