import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { requireAuth } from '@/lib/auth/middleware';
import { getTouristProfile } from '@/lib/auth/tourist-helpers';

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

    const profile = await getTouristProfile(userOrResponse.id);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Профиль не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const itemType = searchParams.get('type');

    let queryText = `SELECT * FROM tourist_wishlist WHERE tourist_id = $1`;
    const params: any[] = [profile.id];

    if (itemType) {
      queryText += ` AND item_type = $2`;
      params.push(itemType);
    }

    queryText += ` ORDER BY created_at DESC`;

    const result = await query(queryText, params);

    return NextResponse.json({
      success: true,
      data: result.rows
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error fetching wishlist:', error);
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

    const profile = await getTouristProfile(userOrResponse.id);
    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Профиль не найден' } as ApiResponse<null>,
        { status: 404 }
      );
    }

    const body = await request.json();
    const { itemType, itemId, priority, notes, notifyOnDiscount, notifyOnAvailability } = body;

    const validTypes = ['tour', 'accommodation', 'partner', 'destination', 'activity'];
    if (!itemType || !validTypes.includes(itemType)) {
      return NextResponse.json(
        { success: false, error: 'Укажите корректный тип элемента' } as ApiResponse<null>,
        { status: 400 }
      );
    }

    if (!itemId) {
      return NextResponse.json(
        { success: false, error: 'Укажите ID элемента' } as ApiResponse<null>,
        { status: 400 }
      );
    }

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
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error adding to wishlist:', error);
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

    const profile = await getTouristProfile(userOrResponse.id);
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
    } as ApiResponse<any>);
  } catch (error) {
    console.error('Error removing from wishlist:', error);
    return NextResponse.json(
      { success: false, error: 'Ошибка при удалении из избранного' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
