/**
 * GET /api/ready
 * Лёгкий health check для Timeweb — отвечает 200 мгновенно, без подключения к БД.
 * Используется ТОЛЬКО для прохождения health check при деплое.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ready',
    timestamp: new Date().toISOString(),
  }, {
    headers: {
      'Cache-Control': 'no-store',
    },
  });
}
