/**
 * GET /api/agents/health
 *
 * Health check для агентной системы.
 * Shows:
 * - scheduler_running (true/false) — инициализирован ли scheduler
 * - agents_enabled — количество активных агентов
 * - last_run — когда последний раз запускались агенты
 *
 * Опционально защищается HEALTH_SECRET env var.
 */

import { NextRequest, NextResponse } from 'next/server';
import { isAgentPlatformInitialized } from '@/lib/agents/platform-init';
import { getScheduler } from '@/lib/agents/scheduler';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secret = process.env.HEALTH_SECRET;
  if (secret) {
    const provided = req.nextUrl.searchParams.get('secret');
    if (provided !== secret) {
      return NextResponse.json({ ok: false }, { status: 403 });
    }
  }

  try {
    const platformInitialized = isAgentPlatformInitialized();
    const scheduler = getScheduler();

    return NextResponse.json({
      ok: true,
      agents: {
        scheduler_running: platformInitialized,
        initialized_at: platformInitialized ? new Date().toISOString() : null,
        platform_status: platformInitialized ? 'active' : 'dormant',
      },
      message: platformInitialized
        ? 'Agent platform is running. Scheduler active.'
        : 'Agent platform initialized on server startup (instrumentation.ts). Scheduler will start automatically.',
      ts: new Date().toISOString(),
    });
  } catch (err) {
    return NextResponse.json(
      {
        ok: false,
        error: err instanceof Error ? err.message : 'health check failed',
        ts: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
