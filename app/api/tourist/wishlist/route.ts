import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAuth } from '@/lib/auth/middleware';
import { getTouristProfile } from '@/lib/auth/tourist-helpers';

const AddWishlistItemSchema = z.object({
  itemType: z.enum(['tour', 'accommodation', 'partner', 'destination', 'activity'], {
    errorMap: () => ({ message: 'Укажите корректный тип элемента' }),
  }),
  itemId: z.string().min(1, 'Укажите ID элемента'),
  priority: z.enum(['low', 'medium', 'high']).optional(),
  notes: z.string().optional(),
  notifyOnDiscount: z.boolean().optional(),
  notifyOnAvailability: z.boolean().optional(),
});

export const dynamic = 'force-dynamic';

/**
 * GET /api/tourist/wishlist - Get tourist wishlist
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const profile = await getTouristProfile(userOrResponse.userId);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Профиль не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const itemType = searchParams.get('type');

    let queryText = `SELECT * FROM tourist_wishlist WHERE tourist_id = $1`;
    const params: unknown[] = [profile.id];

    if (itemType) {
      queryText += ` AND item_type = $2`;
      params.push(itemType);
    }

    queryText += ` ORDER BY created_at DESC`;

    const result = await query(queryText, params);

    return NextResponse.json({
      success: true,
      data: result.rows
    } as ApiResponse<unknown>);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении избранного' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

/**
 * POST /api/tourist/wishlist - Add item to wishlist
 */
export async function POST(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const profile = await getTouristProfile(userOrResponse.userId);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Профиль не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const body = await request.json();
    const parsed = AddWishlistItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' } as ApiResponse<null>,
        { status: 400 }
      );
    }
    const { itemType, itemId, priority, notes, notifyOnDiscount, notifyOnAvailability } = parsed.data;

    const result = await query(
      `INSERT INTO tourist_wishlist (tourist_id, item_type, item_id, priority, notes, notify_on_discount, notify_on_availability)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tourist_id, item_type, item_id) DO UPDATE
       SET priority = EXCLUDED.priority, notes = EXCLUDED.notes, notify_on_discount = EXCLUDED.notify_on_discount, notify_on_availability = EXCLUDED.notify_on_availability
       RETURNING *`,
      [profile.id, itemType, itemId, priority || 'medium', notes || null, notifyOnDiscount || false, notifyOnAvailability || false]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0]
    } as ApiResponse<unknown>);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка при добавлении в избранное' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tourist/wishlist - Remove item from wishlist
 */
export async function DELETE(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) {
      return userOrResponse;
    }

    const profile = await getTouristProfile(userOrResponse.userId);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Профиль не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const wishlistId = searchParams.get('id');

    if (!wishlistId) {
      return NextResponse.json(
        { success: false, error: 'Укажите ID элемента' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    await query(
      `DELETE FROM tourist_wishlist WHERE id = $1 AND tourist_id = $2`,
      [wishlistId, profile.id]
    );

    return NextResponse.json({
      success: true,
      data: { message: 'Удалено из избранного' }
    } as ApiResponse<unknown>);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка при удалении из избранного' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
