import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { AdminUser } from '@/types/admin';
import { ApiResponse, PaginatedResponse } from '@/types';
import { requireAdmin } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

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
    
    // Параметры пагинации
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const offset = (page - 1) * limit;

    // Фильтры
    const role = searchParams.get('role');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const sortByParam = searchParams.get('sortBy') || 'created_at';
    const sortOrderParam = searchParams.get('sortOrder') || 'desc';
    const allowedSortFields = new Set(['created_at', 'updated_at', 'name', 'email', 'role']);
    const sortBy = allowedSortFields.has(sortByParam) ? sortByParam : 'created_at';
    const sortOrder = sortOrderParam.toLowerCase() === 'asc' ? 'asc' : 'desc';

    // Строим WHERE условия
    const whereConditions: string[] = [];
    const queryParams: any[] = [];
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
    const total = parseInt(countResult.rows[0].total);

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
      bookingsCount: parseInt(row.bookings_count),
      totalSpent: parseFloat(row.total_spent)
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

    // Валидация
    if (!body.email || !body.name || !body.role) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields: email, name, role'
      } as ApiResponse<null>, { status: 400 });
    }

    // Проверка валидности роли
    const validRoles = ['tourist', 'operator', 'guide', 'transfer', 'agent', 'admin'];
    if (!validRoles.includes(body.role)) {
      return NextResponse.json({
        success: false,
        error: `Invalid role. Must be one of: ${validRoles.join(', ')}`
      } as ApiResponse<null>, { status: 400 });
    }

    // Проверка, существует ли уже пользователь с таким email
    const existingUserQuery = 'SELECT id FROM users WHERE email = $1';
    const existingUserResult = await query(existingUserQuery, [body.email]);

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

    const preferences = body.preferences || {};
    const result = await query(createUserQuery, [
      body.email,
      body.name,
      body.role,
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
