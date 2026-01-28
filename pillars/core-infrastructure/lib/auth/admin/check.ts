/**
 * Проверка прав администратора
 */

import { NextRequest, NextResponse } from 'next/server';

/**
 * Проверить права администратора
 * @param request - Next.js Request объект
 * @returns NextResponse с ошибкой или null если все ок
 */
export async function requireAdmin(request: NextRequest): Promise<NextResponse | null> {
  const userId = request.headers.get('x-user-id');
  const userRole = request.headers.get('x-user-role');

  if (!userId || !userRole) {
    return NextResponse.json(
      { success: false, error: 'Требуется аутентификация' },
      { status: 401 }
    );
  }

  if (userRole !== 'admin') {
    return NextResponse.json(
      { success: false, error: 'Доступ запрещён. Требуются права администратора.' },
      { status: 403 }
    );
  }

  return null;
}

/**
 * Извлекает userId из заголовков запроса
 * @param request - Next.js Request объект
 * @returns userId или null
 */
export function getAdminUserId(request: NextRequest): string | null {
  return request.headers.get('x-user-id');
}

/**
 * Проверяет права администратора и возвращает userId
 * @param request - Next.js Request объект
 * @returns { userId: string, error: NextResponse | null }
 */
export async function validateAdmin(request: NextRequest): Promise<{
  userId: string | null;
  error: NextResponse | null;
}> {
  const error = await requireAdmin(request);

  if (error) {
    return { userId: null, error };
  }

  const userId = getAdminUserId(request);
  return { userId, error: null };
}
