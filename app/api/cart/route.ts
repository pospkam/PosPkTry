import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

const AddToCartSchema = z.object({
  sessionId: z.string().min(1, 'Укажите ID сессии'),
  souvenirId: z.string().uuid('Укажите корректный ID товара'),
  quantity: z.number().int('Количество должно быть целым числом').min(1, 'Минимальное количество: 1').max(100, 'Максимальное количество: 100'),
});

/**
 * GET /api/cart - Получить корзину
 * Public by design: guest cart by session (sessionId query param).
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
    } as ApiResponse<unknown>);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/cart - Добавить в корзину
 * Public by design: guest cart by session (sessionId in body).
 */
export async function POST(request: NextRequest) {
  try {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({
        success: false,
        error: 'Неверный формат запроса'
      } as ApiResponse<null>, { status: 400 });
    }

    const validationResult = AddToCartSchema.safeParse(body);
    if (!validationResult.success) {
      const errorMessage = validationResult.error.errors[0]?.message || 'Ошибка валидации';
      return NextResponse.json({
        success: false,
        error: errorMessage
      } as ApiResponse<null>, { status: 400 });
    }

    const { sessionId, souvenirId, quantity } = validationResult.data;

    const souvenir = await query<{ price: string }>('SELECT * FROM souvenirs WHERE id = $1', [souvenirId]);
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
    } as ApiResponse<unknown>);
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Ошибка'
    } as ApiResponse<null>, { status: 500 });
  }
}

