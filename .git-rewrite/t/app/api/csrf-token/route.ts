/**
 * CSRF TOKEN ENDPOINT
 * GET /api/csrf-token - Получение CSRF токена
 */

import { NextRequest } from 'next/server';
import { getCsrfTokenEndpoint } from '@/lib/middleware/csrf';

export const dynamic = 'force-dynamic';

// AUTH: Public — CSRF token needed for forms before auth
export async function GET(request: NextRequest) {
  return getCsrfTokenEndpoint(request);
}
