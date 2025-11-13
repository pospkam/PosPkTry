/**
 * Middleware для проверки аутентификации и ролей
 */

import { NextRequest, NextResponse } from 'next/server';
import { getUserFromRequest, JWTPayload } from './jwt';

/**
 * Проверить аутентификацию пользователя
 */
export async function requireAuth(request: NextRequest): Promise<JWTPayload | NextResponse> {
  const user = await getUserFromRequest(request);

  if (!user) {
    return NextResponse.json(
      { success: false, error: 'Требуется аутентификация' },
      { status: 401 }
    );
  }

  return user;
}

/**
 * Проверить роль пользователя
 */
export async function requireRole(
  request: NextRequest,
  allowedRoles: string[]
): Promise<JWTPayload | NextResponse> {
  const userOrResponse = await requireAuth(request);

  if (userOrResponse instanceof NextResponse) {
    return userOrResponse;
  }

  const user = userOrResponse as JWTPayload;

  if (!allowedRoles.includes(user.role)) {
    return NextResponse.json(
      { success: false, error: 'Недостаточно прав доступа' },
      { status: 403 }
    );
  }

  return user;
}

/**
 * Проверить, что пользователь - админ
 */
export async function requireAdmin(request: NextRequest): Promise<JWTPayload | NextResponse> {
  return requireRole(request, ['admin']);
}

/**
 * Проверить, что пользователь - оператор
 */
export async function requireOperator(request: NextRequest): Promise<JWTPayload | NextResponse> {
  return requireRole(request, ['operator', 'admin']);
}

/**
 * Проверить, что пользователь - агент
 */
export async function requireAgent(request: NextRequest): Promise<JWTPayload | NextResponse> {
  return requireRole(request, ['agent', 'admin']);
}

/**
 * Проверить, что пользователь - транспортный оператор
 */
export async function requireTransferOperator(request: NextRequest): Promise<JWTPayload | NextResponse> {
  return requireRole(request, ['transfer_operator', 'admin']);
}

