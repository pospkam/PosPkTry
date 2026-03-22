import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';
import { verifyAuth } from '@/lib/auth';
import { ApiResponse, User } from '@/types';

export const dynamic = 'force-dynamic';

const UpdateProfileSchema = z.object({
  name: z.string().min(1, 'Укажите корректное имя').optional(),
  email: z.string().email('Укажите корректный email').optional(),
  phone: z.string().min(5, 'Укажите корректный номер телефона').optional(),
  preferences: z.record(z.unknown()).optional(),
  avatar: z.string().url('Укажите корректный URL аватара').optional(),
});

/**
 * GET /api/profile
 * Получение данных текущего пользователя
 */
export async function GET(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' } as ApiResponse<null>,
      { status: 401 }
    );
  }

  const result = await query<{
    id: string;
    email: string;
    name: string;
    phone: string | null;
    role: string;
    preferences: Record<string, unknown> | null;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT id, email, name, phone, role, preferences, created_at, updated_at
     FROM users WHERE id = $1 LIMIT 1`,
    [auth.userId]
  );

  if (result.rows.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Пользователь не найден' } as ApiResponse<null>,
      { status: 404 }
    );
  }

  const u = result.rows[0];

  return NextResponse.json({
    success: true,
    data: {
      id: u.id,
      email: u.email,
      name: u.name,
      phone: u.phone ?? '',
      role: u.role,
      preferences: u.preferences ?? {},
      createdAt: u.created_at,
      updatedAt: u.updated_at,
    },
  } as unknown as ApiResponse<Partial<User> & { phone: string }>);
}

/**
 * PUT /api/profile
 * Обновление имени, телефона и предпочтений пользователя.
 * Email изменению не подлежит — используйте отдельную процедуру смены email.
 */
export async function PUT(request: NextRequest) {
  const auth = await verifyAuth(request);
  if (!auth.isAuthenticated || !auth.userId) {
    return NextResponse.json(
      { success: false, error: 'Не авторизован' } as ApiResponse<null>,
      { status: 401 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Неверный формат запроса' } as ApiResponse<null>,
      { status: 400 }
    );
  }

  const validationResult = UpdateProfileSchema.safeParse(body);
  if (!validationResult.success) {
    const errorMessage = validationResult.error.errors[0]?.message || 'Ошибка валидации';
    return NextResponse.json(
      { success: false, error: errorMessage } as ApiResponse<null>,
      { status: 400 }
    );
  }

  const { name, phone, preferences } = validationResult.data;

  // Собираем только переданные поля
  const updates: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (name !== undefined) {
    updates.push(`name = $${idx++}`);
    params.push(name.trim());
  }
  if (phone !== undefined) {
    updates.push(`phone = $${idx++}`);
    params.push(phone.trim() || null);
  }
  if (preferences !== undefined) {
    updates.push(`preferences = $${idx++}::jsonb`);
    params.push(JSON.stringify(preferences));
  }

  if (updates.length === 0) {
    return NextResponse.json(
      { success: false, error: 'Нет данных для обновления' } as ApiResponse<null>,
      { status: 400 }
    );
  }

  updates.push(`updated_at = NOW()`);
  params.push(auth.userId);

  await query(
    `UPDATE users SET ${updates.join(', ')} WHERE id = $${idx}`,
    params
  );

  return NextResponse.json({ success: true, data: null } as ApiResponse<null>);
}
