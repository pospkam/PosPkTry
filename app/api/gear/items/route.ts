import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { getGearPartnerId } from '@/lib/auth/gear-helpers';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/gear/items - Get partner's gear items (auth required)
 */
export async function GET(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult.userId;

    const partnerId = await getGearPartnerId(userId);
    
    if (!partnerId) {
      return NextResponse.json({
        success: false,
        error: 'Профиль партнёра не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const isActive = searchParams.get('active');

    let queryStr = `
      SELECT * FROM gear_items 
      WHERE partner_id = $1
    `;
    const params: any[] = [partnerId];
    let paramIndex = 2;

    if (category) {
      queryStr += ` AND category = $${paramIndex}`;
      params.push(category);
      paramIndex++;
    }

    if (isActive !== null) {
      queryStr += ` AND is_active = $${paramIndex}`;
      params.push(isActive === 'true');
      paramIndex++;
    }

    queryStr += ` ORDER BY created_at DESC`;

    const result = await query(queryStr, params);

    return NextResponse.json({
      success: true,
      data: { items: result.rows }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get gear items error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении снаряжения'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/gear/items - Create new gear item (auth required)
 */
export async function POST(request: NextRequest) {
  try {
    const authResult = await requireAuth(request);
    if (authResult instanceof NextResponse) return authResult;
    const userId = authResult.userId;

    const partnerId = await getGearPartnerId(userId);
    
    if (!partnerId) {
      return NextResponse.json({
        success: false,
        error: 'Профиль партнёра не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const body = await request.json();
    const {
      name, description, category, subcategory, brand, model,
      pricePerDay, pricePerWeek, pricePerMonth,
      quantity, depositAmount, insuranceCostPerDay,
      images, specifications, features, condition, tags
    } = body;

    if (!name || !category || !pricePerDay || !quantity) {
      return NextResponse.json({
        success: false,
        error: 'Заполните обязательные поля'
      } as ApiResponse<null>, { status: 400 });
    }

    const result = await query(
      `INSERT INTO gear_items (
        partner_id, name, description, category, subcategory, brand, model,
        price_per_day, price_per_week, price_per_month,
        quantity, available_quantity, deposit_amount, insurance_cost_per_day,
        images, specifications, features, condition, tags, is_active
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $11, $12, $13, $14, $15, $16, $17, $18, true)
      RETURNING *`,
      [
        partnerId, name, description, category, subcategory, brand, model,
        pricePerDay, pricePerWeek, pricePerMonth,
        quantity, depositAmount, insuranceCostPerDay,
        JSON.stringify(images || []),
        JSON.stringify(specifications || {}),
        JSON.stringify(features || []),
        condition || 'excellent',
        tags || null
      ]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
      message: 'Снаряжение успешно добавлено'
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Create gear item error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при создании снаряжения'
    } as ApiResponse<null>, { status: 500 });
  }
}
