/**
 * CSRF TOKEN ENDPOINT
 * GET /api/csrf-token - Получение CSRF токена
 */

import { NextRequest } from 'next/server';
import { getCsrfTokenEndpoint } from '@/lib/middleware/csrf';

export const dynamic = 'force-dynamic';

// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function GET(request: NextRequest) {
  return getCsrfTokenEndpoint(request);
}
