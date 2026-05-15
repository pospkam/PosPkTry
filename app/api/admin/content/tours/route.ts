import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { TourAdminRow, CountRow } from '@/lib/types/db-rows';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    const status = searchParams.get('status');
    const search = searchParams.get('search');

    const conditions: string[] = [];
    const params: (string | number | boolean)[] = [];
    let paramIndex = 1;

    if (status === 'active') {
      conditions.push('t.is_active = true');
    } else if (status === 'inactive') {
      conditions.push('t.is_active = false');
    }

    if (search) {
      conditions.push(`(t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query<CountRow>(
      `SELECT COUNT(*) as count FROM operator_tours t ${whereClause}`,
      params
    );

    const toursResult = await query<TourAdminRow>(
      `SELECT
         t.id,
         t.title AS name,
         t.description,
         t.difficulty,
         t.duration_days AS duration,
         t.base_price AS price,
         t.currency,
         t.operator_id,
         t.is_active,
         t.rating,
         t.reviews_count AS review_count,
         t.created_at,
         t.updated_at,
         p.name as operator_name,
         t.images,
         COALESCE((SELECT COUNT(*) FROM operator_bookings b WHERE b.operator_tour_id = t.id)::text, '0') as bookings_count
       FROM operator_tours t
       LEFT JOIN partners p ON t.operator_id = p.id
       ${whereClause}
       ORDER BY t.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      success: true,
      data: {
        tours: toursResult.rows,
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
      { success: false, error: 'Ошибка при получении туров' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
