/**
 * Agent Platform Initialization Endpoint
 *
 * This endpoint initializes the agent scheduler, event bus, and other services.
 * Should be called once on app startup (or can be called manually).
 *
 * Requires INIT_SECRET for security (prevent unauthorized initialization).
 */

import { NextRequest, NextResponse } from 'next/server';
import { initializeAgentPlatform } from '@/lib/agents/platform-init';

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const secret = req.headers.get('X-Init-Secret');
    const expectedSecret = process.env.INIT_SECRET || process.env.CRON_SECRET;

    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json(
        { error: 'Unauthorized: invalid INIT_SECRET' },
        { status: 401 }
      );
    }

    await initializeAgentPlatform();

    return NextResponse.json({
      success: true,
      message: 'Agent platform initialized successfully',
      timestamp: new Date().toISOString()
    });
  } catch (err) {

    return NextResponse.json(
      {
        success: false,
        error: err instanceof Error ? err.message : String(err)
      },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('X-Init-Secret');
  const expectedSecret = process.env.INIT_SECRET || process.env.CRON_SECRET;

  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 }
    );
  }

  return NextResponse.json({
    message: 'Use POST to initialize agent platform',
    required_header: 'X-Init-Secret'
  });
}
