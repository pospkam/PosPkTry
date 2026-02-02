import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAuth } from '@/lib/auth/middleware';
import { 
  calculateOrderTotal, 
  applyCouponDiscount, 
  validateOrderData,
  checkSouvenirStock
} from '@/lib/auth/souvenir-helpers';

export const dynamic = 'force-dynamic';

/**
 * POST /api/souvenirs/orders - Create souvenir order
 */
export async function POST(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const body = await request.json();
    const {
      items,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddressLine1,
      shippingAddressLine2,
      shippingCity,
      shippingRegion,
      shippingPostalCode,
      shippingMethod,
      couponCode,
      giftWrap,
      giftMessage,
      notes
    } = body;

    // Validate order data
    const validation = validateOrderData({
      items,
      customerName,
      customerEmail,
      customerPhone,
      shippingAddress: shippingAddressLine1,
      shippingCity
    });

    if (!validation.valid) {
      return NextResponse.json(
        { success: false, error: validation.errors.join(', ') } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Check stock for all items
    for (const item of items) {
      const stockCheck = await checkSouvenirStock(item.souvenirId, item.quantity);
      if (!stockCheck.available) {
        return NextResponse.json(
          { success: false, error: `Недостаточно товара на складе. Доступно: ${stockCheck.availableQuantity}` } as ApiResponse<null>,
          { status: 400 }
        );
      }
    }

    // Calculate order total
    const orderCalculation = await calculateOrderTotal(items);
    if (!orderCalculation.valid) {
      return NextResponse.json(
        { success: false, error: orderCalculation.errors.join(', ') } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const subtotal = orderCalculation.subtotal;
    let couponDiscount = 0;

    // Apply coupon if provided
    if (couponCode) {
      const couponResult = await applyCouponDiscount(couponCode, subtotal, items);
      if (couponResult.valid) {
        couponDiscount = couponResult.discountAmount;
      }
    }

    // Calculate shipping cost (simple logic, can be enhanced)
    const shippingCost = shippingMethod === 'pickup' ? 0 : 500;

    // Calculate total
    const totalAmount = subtotal - couponDiscount + shippingCost;

    // Get partner_id from first item
    const firstItemResult = await query(
      `SELECT partner_id FROM souvenirs WHERE id = $1`,
      [items[0].souvenirId]
    );

    if (firstItemResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Товар не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const partnerId = firstItemResult.rows[0].partner_id;

    // Create order
    await query('BEGIN');

    try {
      const orderResult = await query(
        `INSERT INTO souvenir_orders (
          partner_id, user_id, customer_name, customer_email, customer_phone,
          shipping_address_line1, shipping_address_line2, shipping_city,
          shipping_region, shipping_postal_code,
          subtotal, discount_amount, shipping_cost, total_amount,
          coupon_code, coupon_discount, shipping_method,
          gift_wrap, gift_message, notes, status
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, 'pending'
        ) RETURNING id, order_number`,
        [
          partnerId, userOrResponse.id, customerName, customerEmail, customerPhone,
          shippingAddressLine1, shippingAddressLine2 || null, shippingCity,
          shippingRegion || null, shippingPostalCode || null,
          subtotal, 0, shippingCost, totalAmount,
          couponCode || null, couponDiscount, shippingMethod,
          giftWrap || false, giftMessage || null, notes || null
        ]
      );

      const orderId = orderResult.rows[0].id;
      const orderNumber = orderResult.rows[0].order_number;

      // Add order items
      for (const item of orderCalculation.items) {
        await query(
          `INSERT INTO souvenir_order_items (
            order_id, souvenir_id, product_name, quantity, unit_price, total_price
          ) VALUES ($1, $2, $3, $4, $5, $6)`,
          [orderId, item.id, item.name, item.quantity, item.price, item.total]
        );
      }

      await query('COMMIT');

      return NextResponse.json({
        success: true,
        data: {
          orderId,
          orderNumber,
          totalAmount,
          message: 'Заказ создан'
        }
      } as ApiResponse<any>);
    } catch (error) {
      await query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error creating souvenir order:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка создания заказа' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

/**
 * GET /api/souvenirs/orders - Get user's souvenir orders
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
        so.id,
        so.order_number,
        so.customer_name,
        so.total_amount,
        so.status,
        so.payment_status,
        so.created_at,
        so.shipping_method,
        so.tracking_number,
        json_agg(json_build_object(
          'name', soi.product_name,
          'quantity', soi.quantity,
          'price', soi.unit_price
        )) as items
      FROM souvenir_orders so
      JOIN souvenir_order_items soi ON soi.order_id = so.id
      WHERE so.user_id = $1
    `;

    const params: any[] = [userOrResponse.id];
    let paramIndex = 2;

    if (status) {
      queryText += ` AND so.status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    queryText += ` GROUP BY so.id ORDER BY so.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const result = await query(queryText, params);

    return NextResponse.json({
      success: true,
      data: {
        orders: result.rows,
        pagination: {
          total: result.rows.length,
          limit,
          offset
        }
      }
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error fetching souvenir orders:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка получения заказов' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}