import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAuth } from '@/lib/auth/middleware';
import { verifySouvenirOwnership } from '@/lib/auth/souvenir-helpers';

export const dynamic = 'force-dynamic';

/**
 * GET /api/souvenirs/items/[id] - Get souvenir details
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const souvenirId = params.id;

    const hasAccess = await verifySouvenirOwnership(userOrResponse.id, souvenirId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Доступ запрещен' } as ApiResponse<null>,
        { status: 403 }
      );
    }

    const result = await query(
      `SELECT 
        s.*,
        (SELECT json_agg(json_build_object(
          'transaction_type', transaction_type,
          'quantity_change', quantity_change,
          'quantity_after', quantity_after,
          'created_at', created_at,
          'notes', notes
        ) ORDER BY created_at DESC)
        FROM souvenir_inventory WHERE souvenir_id = s.id LIMIT 10) as recent_inventory,
        (SELECT COUNT(*) FROM souvenir_order_items soi 
         JOIN souvenir_orders so ON soi.order_id = so.id 
         WHERE soi.souvenir_id = s.id AND so.status = 'delivered') as completed_orders,
        (SELECT COUNT(*) FROM souvenir_reviews WHERE souvenir_id = s.id) as total_reviews
       FROM souvenirs s
       WHERE s.id = $1`,
      [souvenirId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Товар не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error fetching souvenir:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении данных товара' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

/**
 * PUT /api/souvenirs/items/[id] - Update souvenir
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const souvenirId = params.id;

    const hasAccess = await verifySouvenirOwnership(userOrResponse.id, souvenirId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Доступ запрещен' } as ApiResponse<null>,
        { status: 403 }
      );
    }

    const body = await request.json();
    const updates: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    const allowedFields = [
      'name', 'description', 'short_description', 'category', 'subcategory',
      'sku', 'price', 'discount_price', 'cost_price',
      'images', 'tags', 'stock_quantity', 'low_stock_threshold',
      'weight', 'dimensions', 'materials', 'origin',
      'artisan_name', 'artisan_bio', 'is_handmade', 'is_exclusive', 'is_featured', 'is_active',
      'min_order_quantity', 'max_order_quantity', 'production_time_days',
      'care_instructions', 'shipping_info', 'meta_title', 'meta_description'
    ];

    for (const field of allowedFields) {
      if (body[field] !== undefined) {
        const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();
        
        if (['images', 'dimensions'].includes(field)) {
          updates.push(`${dbField} = $${paramIndex}::jsonb`);
          values.push(JSON.stringify(body[field]));
        } else if (['tags', 'materials'].includes(field)) {
          updates.push(`${dbField} = $${paramIndex}::text[]`);
          values.push(body[field]);
        } else {
          updates.push(`${dbField} = $${paramIndex}`);
          values.push(body[field]);
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

    values.push(souvenirId);

    const result = await query(
      `UPDATE souvenirs SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error updating souvenir:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при обновлении товара' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/souvenirs/items/[id] - Delete souvenir (soft delete)
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const souvenirId = params.id;

    const hasAccess = await verifySouvenirOwnership(userOrResponse.id, souvenirId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Доступ запрещен' } as ApiResponse<null>,
        { status: 403 }
      );
    }

    // Check for active orders
    const activeCheck = await query(
      `SELECT COUNT(*) as count 
       FROM souvenir_order_items soi
       JOIN souvenir_orders so ON soi.order_id = so.id
       WHERE soi.souvenir_id = $1 AND so.status IN ('pending', 'confirmed', 'processing', 'packed', 'shipped')`,
      [souvenirId]
    );

    if (parseInt(activeCheck.rows[0].count) > 0) {
      return NextResponse.json(
        { success: false, error: 'Невозможно удалить товар с активными заказами' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    // Soft delete
    await query(`UPDATE souvenirs SET is_active = FALSE WHERE id = $1`, [souvenirId]);

    return NextResponse.json({
      success: true,
      data: { message: 'Товар деактивирован' }
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error deleting souvenir:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при удалении товара' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
