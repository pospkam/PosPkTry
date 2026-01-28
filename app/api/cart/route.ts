import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/pillars/core-infrastructure-infrastructure/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/cart - Получить корзину
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId') || 'guest';

    const result = await query(`
      SELECT c.*, 
        json_agg(json_build_object(
          'souvenirId', ci.souvenir_id,
          'quantity', ci.quantity,
          'unitPrice', ci.unit_price,
          'totalPrice', ci.total_price
        )) as items
      FROM shopping_carts c
      LEFT JOIN cart_items ci ON c.id = ci.cart_id
      WHERE c.session_id = $1
      GROUP BY c.id
    `, [sessionId]);

    const cart = result.rows[0] || {
      items: [],
      subtotal: 0,
      total: 0
    };

    return NextResponse.json({
      success: true,
      data: { cart }
    } as ApiResponse<any>);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/cart - Добавить в корзину
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, souvenirId, quantity } = body;

    const souvenir = await query('SELECT * FROM souvenirs WHERE id = $1', [souvenirId]);
    if (souvenir.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'Товар не найден'
      } as ApiResponse<null>, { status: 404 });
    }

    const price = parseFloat(souvenir.rows[0].price);
    const totalPrice = price * quantity;

    await query(`
      INSERT INTO cart_items (cart_id, souvenir_id, quantity, unit_price, total_price)
      SELECT id, $2, $3, $4, $5 FROM shopping_carts 
      WHERE session_id = $1
      ON CONFLICT (cart_id, souvenir_id) 
      DO UPDATE SET quantity = cart_items.quantity + $3
    `, [sessionId, souvenirId, quantity, price, totalPrice]);

    return NextResponse.json({
      success: true,
      message: 'Добавлено в корзину'
    } as ApiResponse<any>);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка'
    } as ApiResponse<null>, { status: 500 });
  }
}

