import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { CountRow } from '@/lib/types/db-rows';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    const search = searchParams.get('search');
    const category = searchParams.get('category');
    const status = searchParams.get('status');

    const conditions: string[] = [];
    const params: (string | number | boolean)[] = [];
    let paramIndex = 1;

    if (search) {
      conditions.push(`(t.title ILIKE $${paramIndex} OR t.description ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }
    if (category) {
      conditions.push(`t.category = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }
    if (status === 'active') {
      conditions.push('t.is_active = true');
    } else if (status === 'inactive') {
      conditions.push('t.is_active = false');
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query<CountRow>(
      `SELECT COUNT(*) as count FROM operator_tours t ${whereClause}`,
      params
    );

    const toursResult = await query(
      `SELECT
         t.id, t.title, t.description, t.category, t.difficulty,
         t.duration_days, t.base_price, t.currency, t.is_active,
         t.rating, t.reviews_count, t.created_at, t.updated_at,
         p.name as operator_name,
         COUNT(b.id) as bookings_count,
         COALESCE(SUM(CASE WHEN b.booking_status IN ('confirmed','completed') THEN COALESCE(b.final_price, b.base_total_price) ELSE 0 END), 0) as total_revenue
       FROM operator_tours t
       LEFT JOIN partners p ON t.operator_id = p.id
       LEFT JOIN operator_bookings b ON t.id = b.operator_tour_id
       ${whereClause}
       GROUP BY t.id, p.name
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
