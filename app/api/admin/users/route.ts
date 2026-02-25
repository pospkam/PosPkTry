import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { AdminUser } from '@/types/admin';
import { ApiResponse, PaginatedResponse } from '@/types';
import { requireAdmin } from '@/lib/auth/middleware';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const ADMIN_USER_ROLES = ['tourist', 'operator', 'guide', 'transfer', 'agent', 'admin', 'stay', 'gear'] as const;
const ADMIN_USER_SORT_FIELDS = ['created_at', 'updated_at', 'name', 'email', 'role'] as const;

const adminUsersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  role: z.enum(ADMIN_USER_ROLES).optional(),
  status: z.string().trim().optional(),
  search: z.string().trim().max(200).optional(),
  sortBy: z.enum(ADMIN_USER_SORT_FIELDS).default('created_at'),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

const createAdminUserSchema = z.object({
  email: z.string().trim().email(),
  name: z.string().trim().min(1).max(120),
  role: z.enum(ADMIN_USER_ROLES),
  preferences: z.record(z.unknown()).optional().default({}),
});

function paramOrUndefined(searchParams: URLSearchParams, key: string): string | undefined {
  const value = searchParams.get(key);
  if (!value) {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

/**
 * GET /api/admin/users
 * Получение списка пользователей с фильтрацией и пагинацией
 */
export async function GET(request: NextRequest) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) {
      return adminOrResponse;
    }
    
    const { searchParams } = new URL(request.url);
    const parsedQuery = adminUsersQuerySchema.safeParse({
      page: paramOrUndefined(searchParams, 'page'),
      limit: paramOrUndefined(searchParams, 'limit'),
      role: paramOrUndefined(searchParams, 'role'),
      status: paramOrUndefined(searchParams, 'status'),
      search: paramOrUndefined(searchParams, 'search'),
      sortBy: paramOrUndefined(searchParams, 'sortBy'),
      sortOrder: paramOrUndefined(searchParams, 'sortOrder')?.toLowerCase(),
    });

    if (!parsedQuery.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid query parameters',
        details: parsedQuery.error.flatten(),
      } as ApiResponse<null>, { status: 400 });
    }

    const { page, limit, role, search, sortBy, sortOrder } = parsedQuery.data;
    const offset = (page - 1) * limit;

    // Строим WHERE условия
    const whereConditions: string[] = [];
    const queryParams: unknown[] = [];
    let paramIndex = 1;

    if (role) {
      whereConditions.push(`u.role = $${paramIndex}`);
      queryParams.push(role);
      paramIndex++;
    }

    // Для статуса: пока у нас нет поля status в схеме, добавим логику позже
    // if (status) {
    //   whereConditions.push(`u.status = $${paramIndex}`);
    //   queryParams.push(status);
    //   paramIndex++;
    // }

    if (search) {
      whereConditions.push(`(u.name ILIKE $${paramIndex} OR u.email ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

    // Подсчёт общего количества
    const countQuery = `
      SELECT COUNT(*) as total
      FROM users u
      ${whereClause}
    `;

    const countResult = await query(countQuery, queryParams);
    const total = Number.parseInt(countResult.rows[0]?.total ?? '0', 10);

    // Получение пользователей
    const usersQuery = `
      SELECT
        u.id,
        u.email,
        u.name,
        u.role,
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
      ${whereClause}
      ORDER BY u.${sortBy} ${sortOrder.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const usersResult = await query(usersQuery, queryParams);

    const users: AdminUser[] = usersResult.rows.map(row => ({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      status: 'active', // По умолчанию, можно добавить логику позже
      emailVerified: true, // По умолчанию
      createdAt: new Date(row.created_at),
      lastLoginAt: row.updated_at ? new Date(row.updated_at) : undefined,
      bookingsCount: Number.parseInt(row.bookings_count ?? '0', 10),
      totalSpent: Number.parseFloat(row.total_spent ?? '0')
    }));

    const response: PaginatedResponse<AdminUser> = {
      data: users,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    };

    return NextResponse.json({
      success: true,
      data: response
    } as ApiResponse<PaginatedResponse<AdminUser>>);

  } catch (error) {
    console.error('Error fetching users:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch users',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}

/**
 * POST /api/admin/users
 * Создание нового пользователя
 */
export async function POST(request: NextRequest) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) {
      return adminOrResponse;
    }

    const body = await request.json();
    const parsedBody = createAdminUserSchema.safeParse(body);
    if (!parsedBody.success) {
      return NextResponse.json({
        success: false,
        error: 'Invalid user payload',
        details: parsedBody.error.flatten(),
      } as ApiResponse<null>, { status: 400 });
    }

    const { email, name, role, preferences } = parsedBody.data;

    // Проверка, существует ли уже пользователь с таким email
    const existingUserQuery = 'SELECT id FROM users WHERE email = $1';
    const existingUserResult = await query(existingUserQuery, [email]);

    if (existingUserResult.rows.length > 0) {
      return NextResponse.json({
        success: false,
        error: 'User with this email already exists'
      } as ApiResponse<null>, { status: 409 });
    }

    // Создание пользователя
    const createUserQuery = `
      INSERT INTO users (email, name, role, preferences)
      VALUES ($1, $2, $3, $4)
      RETURNING id, email, name, role, created_at
    `;

    const result = await query(createUserQuery, [
      email,
      name,
      role,
      JSON.stringify(preferences)
    ]);

    const newUser = result.rows[0];

    return NextResponse.json({
      success: true,
      data: {
        id: newUser.id,
        email: newUser.email,
        name: newUser.name,
        role: newUser.role,
        createdAt: new Date(newUser.created_at)
      },
      message: 'User created successfully'
    } as ApiResponse<{
      id: string;
      email: string;
      name: string;
      role: string;
      createdAt: Date;
    }>);

  } catch (error) {
    console.error('Error creating user:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create user',
      message: error instanceof Error ? error.message : 'Unknown error'
    } as ApiResponse<null>, { status: 500 });
  }
}
