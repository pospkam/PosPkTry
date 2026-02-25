/**
 * Простейший API endpoint для проверки
 */
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    message: 'pong',
    timestamp: new Date().toISOString(),
    env: {
      NODE_ENV: process.env.NODE_ENV,
      PORT: process.env.PORT,
    }
  });
}
