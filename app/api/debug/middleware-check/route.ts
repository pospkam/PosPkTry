/**
 * GET /api/debug/middleware-check?path=/api/admin/leads/list
 * Отладка: проверить распознает ли middleware этот путь как public
 */

import { NextUrl } from 'next/server';

const PUBLIC_API_ROUTES: Record<string, string[] | 'ALL'> = {
  '/api/auth': 'ALL',
  '/api/admin': 'ALL',
  '/api/weather': 'ALL',
  '/api/leads': ['POST'],
  // ... остальные
};

function isPathMatch(pathname: string, route: string): boolean {
  return pathname === route || pathname.startsWith(`${route}/`);
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const testPath = url.searchParams.get('path') || '/api/admin/leads/list';
  const method = url.searchParams.get('method') || 'GET';

  const matches = Object.entries(PUBLIC_API_ROUTES).filter(([route]) => isPathMatch(testPath, route));

  return Response.json({
    testPath,
    method,
    isApiRoute: testPath.startsWith('/api'),
    isPublic: matches.length > 0,
    matchedRoutes: matches.map(([route, methods]) => ({ route, methods })),
  });
}
