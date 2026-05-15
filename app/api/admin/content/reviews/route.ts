import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { ReviewAdminRow, CountRow } from '@/lib/types/db-rows';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    const status = searchParams.get('status'); // verified, unverified
    const search = searchParams.get('search');

    const conditions: string[] = [];
    const params: (string | number | boolean)[] = [];
    let paramIndex = 1;

    if (status === 'verified') {
      conditions.push(`r.is_verified = true`);
    } else if (status === 'unverified') {
      conditions.push(`r.is_verified = false`);
    }

    if (search) {
      conditions.push(`(u.name ILIKE $${paramIndex} OR r.comment ILIKE $${paramIndex} OR t.title ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query<CountRow>(
      `SELECT COUNT(*) as count FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN operator_tours t ON r.tour_id = t.id
       ${whereClause}`,
      params
    );

    const reviewsResult = await query<ReviewAdminRow>(
      `SELECT
         r.id, r.user_id, r.tour_id, r.rating, r.comment, r.is_verified, r.created_at,
         u.name as user_name,
         t.title as tour_name
       FROM reviews r
       LEFT JOIN users u ON r.user_id = u.id
       LEFT JOIN operator_tours t ON r.tour_id = t.id
       ${whereClause}
       ORDER BY r.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      success: true,
      data: {
        reviews: reviewsResult.rows,
        pagination: {
          page,
          limit,
          total: parseInt(countResult.rows[0].count),
          totalPages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
        },
      },
    } as ApiResponse<unknown>);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении отзывов' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const body = await request.json() as { id?: unknown; action?: unknown };
    const { id, action } = body;

    if (!id || typeof id !== 'string') {
      return NextResponse.json({ success: false, error: 'ID обязателен' }, { status: 400 });
    }

    if (action === 'verify') {
      await query('UPDATE reviews SET is_verified = true, updated_at = NOW() WHERE id = $1', [id]);
    } else if (action === 'unverify') {
      await query('UPDATE reviews SET is_verified = false, updated_at = NOW() WHERE id = $1', [id]);
    } else if (action === 'delete') {
      await query('DELETE FROM reviews WHERE id = $1', [id]);
    } else {
      return NextResponse.json({ success: false, error: 'Неверное действие' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Действие выполнено' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка при обновлении отзыва' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
