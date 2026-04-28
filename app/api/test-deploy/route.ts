import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/test-deploy
 * Simple endpoint to verify that new code is deployed
 */
export async function GET() {
  return NextResponse.json({
    deployed: true,
    timestamp: new Date().toISOString(),
    message: 'New code is live! 🎉',
  });
}
