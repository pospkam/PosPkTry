import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAuth } from '@/lib/auth/middleware';
import { verifyCarOwnership } from '@/lib/auth/cars-helpers';

export const dynamic = 'force-dynamic';

const UpdateCarSchema = z.object({
  brand: z.string().optional(),
  model: z.string().optional(),
  year: z.number().optional(),
  vin: z.string().optional(),
  license_plate: z.string().optional(),
  category: z.string().optional(),
  body_type: z.string().optional(),
  transmission: z.string().optional(),
  fuel_type: z.string().optional(),
  engine_volume: z.number().optional(),
  power: z.number().optional(),
  drive_type: z.string().optional(),
  seats: z.number().optional(),
  doors: z.number().optional(),
  color: z.string().optional(),
  mileage: z.number().optional(),
  price_per_day: z.number().optional(),
  price_per_week: z.number().optional(),
  price_per_month: z.number().optional(),
  images: z.array(z.unknown()).optional(),
  features: z.array(z.unknown()).optional(),
  specifications: z.record(z.unknown()).optional(),
  condition: z.string().optional(),
  deposit_amount: z.number().optional(),
  min_driver_age: z.number().optional(),
  min_driver_experience: z.number().optional(),
  insurance_included: z.boolean().optional(),
  insurance_daily_cost: z.number().optional(),
  mileage_limit_per_day: z.number().optional(),
  extra_mileage_cost: z.number().optional(),
  location_address: z.string().optional(),
  pickup_instructions: z.string().optional(),
  return_instructions: z.string().optional(),
  restrictions: z.string().optional(),
  quantity: z.number().optional(),
  is_active: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  last_service_date: z.string().optional(),
  next_service_date: z.string().optional(),
});

/**
 * GET /api/cars/items/[id] - Get car details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const { id: carId } = await params;

    // Verify ownership
    const hasAccess = await verifyCarOwnership(userOrResponse.userId, carId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Автомобиль не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const result = await query(
      `SELECT 
        c.*,
        (SELECT COUNT(*) FROM car_rentals WHERE car_id = c.id AND status = 'active') as active_rentals,
        (SELECT COUNT(*) FROM car_rentals WHERE car_id = c.id AND status = 'confirmed') as upcoming_rentals,
        (SELECT COUNT(*) FROM car_rentals WHERE car_id = c.id AND status = 'completed') as completed_rentals,
        (SELECT AVG(rating) FROM car_reviews WHERE car_id = c.id AND is_public = TRUE) as avg_rating,
        (SELECT json_agg(json_build_object(
          'type', maintenance_type,
          'date', performed_at,
          'cost', cost,
          'description', description
        ) ORDER BY performed_at DESC)
        FROM car_maintenance WHERE car_id = c.id LIMIT 5) as recent_maintenance
       FROM cars c
       WHERE c.id = $1`,
      [carId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Автомобиль не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    } as ApiResponse<unknown>);
  } catch (error) {
    console.error('Error fetching car:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении данных автомобиля' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

/**
 * PUT /api/cars/items/[id] - Update car
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const { id: carId } = await params;

    // Verify ownership
    const hasAccess = await verifyCarOwnership(userOrResponse.userId, carId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Автомобиль не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = UpdateCarSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    // Build dynamic UPDATE query
    const allowedFields = [
      'brand', 'model', 'year', 'vin', 'license_plate',
      'category', 'body_type', 'transmission', 'fuel_type',
      'engine_volume', 'power', 'drive_type', 'seats', 'doors', 'color', 'mileage',
      'price_per_day', 'price_per_week', 'price_per_month',
      'images', 'features', 'specifications', 'condition',
      'deposit_amount', 'min_driver_age', 'min_driver_experience',
      'insurance_included', 'insurance_daily_cost',
      'mileage_limit_per_day', 'extra_mileage_cost',
      'location_address', 'pickup_instructions', 'return_instructions', 'restrictions',
      'quantity', 'is_active', 'is_featured',
      'last_service_date', 'next_service_date'
    ];

    for (const field of allowedFields) {
      if ((parsed.data as any)[field] !== undefined) {
        const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();

        if (['images', 'features', 'specifications'].includes(field)) {
          updates.push(`${dbField} = $${paramIndex}::jsonb`);
          values.push(JSON.stringify((parsed.data as any)[field]));
        } else {
          updates.push(`${dbField} = $${paramIndex}`);
          values.push((parsed.data as any)[field]);
        }
        paramIndex++;
      }
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Нет полей для обновления' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // If quantity changed, update available_quantity
    if ((parsed.data as any).quantity !== undefined) {
      const currentResult = await query<{ quantity: number; available_quantity: number }>(
        `SELECT quantity, available_quantity FROM cars WHERE id = $1`,
        [carId]
      );
      const current = currentResult.rows[0];
      const diff = (parsed.data as any).quantity - current.quantity;
      const newAvailable = Math.max(0, current.available_quantity + diff);

      updates.push(`available_quantity = $${paramIndex}`);
      values.push(newAvailable);
      paramIndex++;
    }

    values.push(carId);

    const result = await query(
      `UPDATE cars SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    } as ApiResponse<unknown>);
  } catch (error) {
    console.error('Error updating car:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при обновлении автомобиля' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/cars/items/[id] - Delete car
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const { id: carId } = await params;

    // Verify ownership
    const hasAccess = await verifyCarOwnership(userOrResponse.userId, carId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Автомобиль не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    // Check for active rentals
    const activeCheck = await query<{ count: string }>(
      `SELECT COUNT(*) as count
       FROM car_rentals
       WHERE car_id = $1 AND status IN ('active', 'confirmed')`,
      [carId]
    );

    if (parseInt(activeCheck.rows[0].count) > 0) {
      return NextResponse.json(
        { success: false, error: 'Невозможно удалить автомобиль с активными бронированиями' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    await query(`DELETE FROM cars WHERE id = $1`, [carId]);

    return NextResponse.json({
      success: true,
      data: { message: 'Автомобиль удален' }
    } as ApiResponse<unknown>);
  } catch (error) {
    console.error('Error deleting car:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при удалении автомобиля' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
