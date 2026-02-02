import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/users
 * Get all users
 */
export async function GET(request: NextRequest) {
  try {
    const userId = request.headers.get('X-User-Id');
    const userRole = request.headers.get('X-User-Role');
    
    if (!userId || userRole !== 'admin') {
      return NextResponse.json({
        success: false,
        error: 'Недостаточно прав'
      } as ApiResponse<null>, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const role = searchParams.get('role');
    const limit = parseInt(searchParams.get('limit') || '100');
    const offset = parseInt(searchParams.get('offset') || '0');

    let queryStr = `
      SELECT 
        id, email, name, role, preferences, created_at, updated_at
      FROM users
    `;

    const params = [];
    let paramIndex = 1;

    if (role) {
      queryStr += ` WHERE role = $${paramIndex++}`;
      params.push(role);
    }

    queryStr += ` ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    params.push(limit, offset);

    const result = await query(queryStr, params);

    const users = result.rows.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      preferences: row.preferences,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    }));

    // Get total count
    const countResult = await query(
      role ? 'SELECT COUNT(*) FROM users WHERE role = $1' : 'SELECT COUNT(*) FROM users',
      role ? [role] : []
    );

    return NextResponse.json({
      success: true,
      data: {
        users,
        total: parseInt(countResult.rows[0].count),
        limit,
        offset
      }
    } as ApiResponse<any>);

  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка при получении пользователей'
    } as ApiResponse<null>, { status: 500 });
  }
}
