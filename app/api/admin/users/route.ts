import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';
import { UsersAdminRow, CountRow } from '@/lib/types/db-rows';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;
    const role = searchParams.get('role');
    const search = searchParams.get('search');

    const conditions: string[] = [];
    const params: (string | number)[] = [];
    let paramIndex = 1;

    if (role && role !== 'all') {
      conditions.push(`u.role = $${paramIndex}`);
      params.push(role);
      paramIndex++;
    }

    if (search) {
      conditions.push(`(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
      params.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    const countResult = await query<CountRow>(
      `SELECT COUNT(*) as count FROM users u ${whereClause}`,
      params
    );

    const usersResult = await query<UsersAdminRow>(
      `SELECT
         u.id, u.email, u.name, u.role, u.preferences, u.created_at, u.updated_at,
         COUNT(b.id)::text as bookings_count,
         COALESCE(SUM(COALESCE(b.final_price, b.base_total_price)) FILTER (WHERE b.booking_status = 'confirmed'), 0)::text as total_spent
       FROM users u
       LEFT JOIN operator_bookings b ON b.metadata->>'user_id' = u.id::text
       ${whereClause}
       GROUP BY u.id
       ORDER BY u.created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, limit, offset]
    );

    return NextResponse.json({
      success: true,
      data: {
        users: usersResult.rows.map(u => ({
          id: u.id,
          email: u.email,
          name: u.name,
          role: u.role,
          preferences: u.preferences,
          createdAt: u.created_at,
          updatedAt: u.updated_at,
          bookingsCount: parseInt(u.bookings_count),
          totalSpent: parseFloat(u.total_spent),
        })),
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
      { success: false, error: 'Ошибка при получении пользователей' } as ApiResponse<null>,
      { status: 500 }
    );
  }
}
