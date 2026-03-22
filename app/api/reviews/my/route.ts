import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse, Review } from '@/types';
import { query } from '@/lib/database';
import { requireAuth } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

/**
 * GET /api/reviews/my — Мои отзывы (отзывы текущего пользователя)
 */
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireAuth(request);
    if (userOrResponse instanceof NextResponse) return userOrResponse;

    const userId = userOrResponse.userId;
    const { searchParams } = new URL(request.url);
    const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10) || 20, 100);
    const offset = parseInt(searchParams.get('offset') ?? '0', 10) || 0;

    const result = await query(
      `SELECT
        r.id, r.tour_id, r.rating, r.comment, r.images,
        r.created_at, r.updated_at,
        t.name as tour_name
      FROM reviews r
      LEFT JOIN tours t ON r.tour_id = t.id
      WHERE r.user_id = $1
      ORDER BY r.created_at DESC
      LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    const countResult = await query<{ total: string }>(
      `SELECT COUNT(*) as total FROM reviews WHERE user_id = $1`,
      [userId]
    );

    const reviews = result.rows.map(row => ({
      id: row.id,
      tourId: row.tour_id,
      tourName: row.tour_name,
      rating: row.rating,
      comment: row.comment,
      images: row.images ?? [],
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({
      success: true,
      data: {
        reviews,
        total: parseInt(countResult.rows[0].total, 10),
      },
    } as ApiResponse<{ reviews: typeof reviews; total: number }>);
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка при получении отзывов' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
