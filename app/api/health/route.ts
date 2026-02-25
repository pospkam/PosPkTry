/**
 * Health Check Endpoint для Timeweb Apps
 * Простая проверка что приложение работает
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    service: 'kamchatour-hub',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '0.1.0'
  });
}
