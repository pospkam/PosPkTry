import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireAdmin } from '@/lib/auth/middleware';
import { AdminUser } from '@/types/admin';
import { ApiResponse } from '@/types';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const ADMIN_USER_ROLES = ['tourist', 'operator', 'guide', 'transfer', 'agent', 'admin', 'stay', 'gear'] as const;

const updateAdminUserSchema = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  email: z.string().trim().email().optional(),
  role: z.enum(ADMIN_USER_ROLES).optional(),
  preferences: z.record(z.unknown()).optional(),
}).refine(
  (data) => Object.keys(data).length > 0,
  { message: 'No fields to update' }
);

/**
 * GET /api/admin/users/[id]
 * Получение информации о конкретном пользователе
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) {
      return adminOrResponse;
    }
    const { id } = await context.params;

    const userQuery = `
      SELECT
        u.id,
        u.email,
        u.name,
        u.role,
        u.preferences,
        u.created_at,
        u.updated_at,
        COALESCE(b.bookings_count, 0) as bookings_count,
        COALESCE(b.total_spent, 0) as total_spent
      FROM users u
      LEFT JOIN (
        SELECT
          user_id,
          COUNT(*) as bookings_count,
          SUM(total_price) as total_spent
        FROM bookings
        WHERE payment_status = 'paid'
        GROUP BY user_id
      ) b ON u.id = b.user_id
      WHERE u.id = $1
    `;

    const result = await query(userQuery, [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      } as ApiResponse<null>, { status: 404 });
    }

    const row = result.rows[0];
    const user: AdminUser = {
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      status: 'active',
      emailVerified: true,
      createdAt: new Date(row.created_at),
      lastLoginAt: row.updated_at ? new Date(row.updated_at) : undefined,
      bookingsCount: parseInt(row.bookings_count),
      totalSpent: parseFloat(row.total_spent)
    };

    return NextResponse.json({
      success: true,
      data: user
    } as ApiResponse<AdminUser>);

  } catch (error) {
    console.error('Error fetching user:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch user',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * PUT /api/admin/users/[id]
 * Обновление информации о пользователе
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) {
      return adminOrResponse;
    }
    const { id } = await context.params;
    const body = await request.json();
    const parsedBody = updateAdminUserSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid user payload',
        details: parsedBody.error.flatten(),
      } as ApiResponse<null>, { status: 400 });
    }

    const { name, email, role, preferences } = parsedBody.data;

    // Проверяем, существует ли пользователь
    const checkQuery = 'SELECT id, role FROM users WHERE id = $1';
    const checkResult = await query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      } as ApiResponse<null>, { status: 404 });
    }

    const existingUser = checkResult.rows[0] as { id: string; role: string };

    if (email) {
      const emailCheck = await query('SELECT id FROM users WHERE email = $1 AND id <> $2 LIMIT 1', [email, id]);
      if (emailCheck.rows.length > 0) {
        return NextResponse.json({
          success: false,
          error: 'User with this email already exists'
        } as ApiResponse<null>, { status: 409 });
      }
    }

    // Защита: нельзя понизить последнего администратора через update.
    if (role && existingUser.role === 'admin' && role !== 'admin') {
      const adminCountResult = await query('SELECT COUNT(*) as count FROM users WHERE role = $1', ['admin']);
      const adminCount = Number.parseInt(adminCountResult.rows[0]?.count ?? '0', 10);
      if (adminCount <= 1) {
        return NextResponse.json({
          success: false,
          error: 'Cannot demote the last admin user'
        } as ApiResponse<null>, { status: 400 });
      }
    }

    // Строим динамический запрос обновления
    const updates: string[] = [];
    const values: unknown[] = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }

    if (email !== undefined) {
      updates.push(`email = $${paramIndex}`);
      values.push(email);
      paramIndex++;
    }

    if (role !== undefined) {
      updates.push(`role = $${paramIndex}`);
      values.push(role);
      paramIndex++;
    }

    if (preferences !== undefined) {
      updates.push(`preferences = $${paramIndex}`);
      values.push(JSON.stringify(preferences));
      paramIndex++;
    }

    // Добавляем updated_at
    updates.push(`updated_at = NOW()`);

    // ID в конец
    const idParamIndex = values.length + 1;
    values.push(id);

    const updateQuery = `
      UPDATE users
      SET ${updates.join(', ')}
      WHERE id = $${idParamIndex}
      RETURNING id, email, name, role, updated_at
    `;

    const result = await query(updateQuery, values);
    const updatedUser = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        updatedAt: new Date(updatedUser.updated_at)
      },
      message: 'User updated successfully'
    } as ApiResponse<{
      id: string;
      email: string;
      name: string;
      role: string;
      updatedAt: Date;
    }>);

  } catch (error) {
    console.error('Error updating user:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update user',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * DELETE /api/admin/users/[id]
 * Удаление пользователя
 */
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) {
      return adminOrResponse;
    }
    const { id } = await context.params;

    // Проверяем, существует ли пользователь
    const checkQuery = 'SELECT id, role FROM users WHERE id = $1';
    const checkResult = await query(checkQuery, [id]);

    if (checkResult.rows.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'User not found'
      } as ApiResponse<null>, { status: 404 });
    }

    // Не даем удалить единственного админа
    if (checkResult.rows[0].role === 'admin') {
      const adminCountQuery = 'SELECT COUNT(*) as count FROM users WHERE role = $1';
      const adminCountResult = await query(adminCountQuery, ['admin']);
      
      if (Number.parseInt(adminCountResult.rows[0]?.count ?? '0', 10) <= 1) {
        return NextResponse.json({
          success: false,
          error: 'Cannot delete the last admin user'
        } as ApiResponse<null>, { status: 400 });
      }
    }

    // Удаляем пользователя
    const deleteQuery = 'DELETE FROM users WHERE id = $1';
    await query(deleteQuery, [id]);

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully'
    } as ApiResponse<null>);

  } catch (error) {
    console.error('Error deleting user:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to delete user',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}



