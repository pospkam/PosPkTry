import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/pillars/core-infrastructure-infrastructure/lib/database';
import { ApiResponse } from '@/types';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * POST /api/gear/rentals - Создание заявки на аренду снаряжения
 */
export async function POST(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const body = await request.json();
    const {
      gearId,
      gearName,
      customer,
      rental,
      pricing,
      comments
    } = body;

    // Валидация данных
    if (!customer?.name || !customer?.email || !customer?.phone) {
      return NextResponse.json(
        { success: false, error: 'Необходимо указать контактные данные' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    if (!rental?.startDate || !rental?.endDate) {
      return NextResponse.json(
        { success: false, error: 'Необходимо указать даты аренды' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Проверяем доступность снаряжения
    const availabilityCheck = await query(`
      SELECT available_quantity, price_per_day, price_per_week
      FROM gear
      WHERE id = $1
    `, [gearId]);

    if (availabilityCheck.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Снаряжение не найдено' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const gearData = availabilityCheck.rows[0];
    if (gearData.available_quantity < rental.quantity) {
      return NextResponse.json(
        { success: false, error: 'Недостаточное количество доступного снаряжения' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Создаем заявку на аренду
    const result = await query(`
      INSERT INTO gear_rentals (
        id, gear_id, customer_name, customer_email, customer_phone,
        start_date, end_date, quantity, days_count, insurance,
        base_price, insurance_cost, total_price, comments, status, created_at
      ) VALUES (
        gen_random_uuid(),
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending', NOW()
      ) RETURNING id
    `, [
      gearId,
      customer.name,
      customer.email,
      customer.phone,
      rental.startDate,
      rental.endDate,
      rental.quantity,
      rental.days,
      rental.insurance,
      pricing.basePrice,
      pricing.insuranceCost,
      pricing.totalPrice,
      comments || null
    ]);

    const rentalId = result.rows[0].id;

    return NextResponse.json({
      success: true,
      data: {
        rentalId,
        message: 'Заявка на аренду создана успешно'
      }
    } as ApiResponse<{ rentalId: string; message: string }>);

  } catch (error) {
    console.error('Error creating gear rental:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка создания заявки на аренду' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

/**
 * GET /api/gear/rentals - Получение списка заявок на аренду (для администратора)
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const userId = userOrResponse.userId;
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const limit = parseInt(searchParams.get('limit') || '50');

    let queryText = `
      SELECT
        gr.id,
        gr.gear_id,
        gr.customer_name,
        gr.customer_email,
        gr.customer_phone,
        gr.start_date,
        gr.end_date,
        gr.quantity,
        gr.days_count,
        gr.insurance,
        gr.base_price,
        gr.insurance_cost,
        gr.total_price,
        gr.comments,
        gr.status,
        gr.created_at,
        g.name as gear_name,
        g.category as gear_category
      FROM gear_rentals gr
      JOIN gear g ON gr.gear_id = g.id
    `;

    const params: any[] = [];
    const whereConditions: string[] = [];

    // Фильтр по статусу
    if (status) {
      whereConditions.push(`gr.status = $${params.length + 1}`);
      params.push(status);
    }

    if (whereConditions.length > 0) {
      queryText += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    queryText += ` ORDER BY gr.created_at DESC LIMIT $${params.length + 1}`;
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
    console.error('Error fetching gear rentals:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка получения заявок на аренду' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}