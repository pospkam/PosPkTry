import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAuth } from '@/lib/auth/middleware';
import { verifySouvenirOwnership } from '@/lib/auth/souvenir-helpers';

export const dynamic = 'force-dynamic';

const UpdateSouvenirSchema = z.object({
  name: z.string().optional(),
  description: z.string().optional(),
  short_description: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  sku: z.string().optional(),
  price: z.number().optional(),
  discount_price: z.number().optional(),
  cost_price: z.number().optional(),
  images: z.array(z.unknown()).optional(),
  tags: z.array(z.unknown()).optional(),
  stock_quantity: z.number().optional(),
  low_stock_threshold: z.number().optional(),
  weight: z.number().optional(),
  dimensions: z.record(z.unknown()).optional(),
  materials: z.array(z.unknown()).optional(),
  origin: z.string().optional(),
  artisan_name: z.string().optional(),
  artisan_bio: z.string().optional(),
  is_handmade: z.boolean().optional(),
  is_exclusive: z.boolean().optional(),
  is_featured: z.boolean().optional(),
  is_active: z.boolean().optional(),
  min_order_quantity: z.number().optional(),
  max_order_quantity: z.number().optional(),
  production_time_days: z.number().optional(),
  care_instructions: z.string().optional(),
  shipping_info: z.string().optional(),
  meta_title: z.string().optional(),
  meta_description: z.string().optional(),
});

/**
 * GET /api/souvenirs/items/[id] - Get souvenir details
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

    const { id: souvenirId } = await params;

    const hasAccess = await verifySouvenirOwnership(userOrResponse.userId, souvenirId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Товар не найден' } as ApiResponse<null>,
        { status: 404 }
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
    } as ApiResponse<unknown>);
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const { id: souvenirId } = await params;

    const hasAccess = await verifySouvenirOwnership(userOrResponse.userId, souvenirId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Товар не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = UpdateSouvenirSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    const updates: string[] = [];
    const values: unknown[] = [];
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
      if ((parsed.data as any)[field] !== undefined) {
        const dbField = field.replace(/([A-Z])/g, '_$1').toLowerCase();

        if (['images', 'dimensions'].includes(field)) {
          updates.push(`${dbField} = $${paramIndex}::jsonb`);
          values.push(JSON.stringify((parsed.data as any)[field]));
        } else if (['tags', 'materials'].includes(field)) {
          updates.push(`${dbField} = $${paramIndex}::text[]`);
          values.push((parsed.data as any)[field]);
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

    values.push(souvenirId);

    const result = await query(
      `UPDATE souvenirs SET ${updates.join(', ')}, updated_at = NOW() WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    } as ApiResponse<unknown>);
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
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const { id: souvenirId } = await params;

    const hasAccess = await verifySouvenirOwnership(userOrResponse.userId, souvenirId);
    if (!hasAccess) {
      return NextResponse.json(
        { success: false, error: 'Товар не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    // Check for active orders
    const activeCheck = await query<{ count: string }>(
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
    } as ApiResponse<unknown>);
  } catch (error) {
    console.error('Error deleting souvenir:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при удалении товара' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
