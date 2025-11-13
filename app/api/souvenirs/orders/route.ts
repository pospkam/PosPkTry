import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * POST /api/souvenirs/orders - Создание заказа сувениров
 */
export async function POST(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const body = await request.json();
    const {
      customer,
      items,
      delivery,
      comments,
      totalPrice,
      totalItems
    } = body;

    // Валидация данных
    if (!customer?.name || !customer?.email || !customer?.phone) {
      return NextResponse.json(
        { success: false, error: 'Необходимо указать контактные данные' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    if (!items || items.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Корзина пуста' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Создаем заказ в транзакции
    const result = await query(`
      INSERT INTO souvenir_orders (
        id, customer_name, customer_email, customer_phone,
        delivery_method, delivery_address, comments,
        total_price, total_items, status, created_at
      ) VALUES (
        gen_random_uuid(),
        $1, $2, $3, $4, $5, $6, $7, $8, 'pending', NOW()
      ) RETURNING id
    `, [
      customer.name,
      customer.email,
      customer.phone,
      delivery?.method || 'pickup',
      delivery?.address || null,
      comments || null,
      totalPrice,
      totalItems
    ]);

    const orderId = result.rows[0].id;

    // Добавляем товары заказа
    for (const item of items) {
      await query(`
        INSERT INTO souvenir_order_items (
          id, order_id, souvenir_id, name, price, quantity, created_at
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5, NOW()
        )
      `, [
        orderId,
        item.souvenirId,
        item.name,
        item.price,
        item.quantity
      ]);

      // Уменьшаем количество товара на складе (если нужно)
      // await query('UPDATE souvenirs SET stock = stock - $1 WHERE id = $2', [item.quantity, item.souvenirId]);
    }

    return NextResponse.json({
      success: true,
      data: {
        orderId,
        message: 'Заказ успешно создан'
      }
    } as ApiResponse<{ orderId: string; message: string }>);

  } catch (error) {
    console.error('Error creating souvenir order:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка создания заказа' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}