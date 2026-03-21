/**
 * GET /api/agents/health
 *
 * Публичный health check агентной системы.
 * Используется для мониторинга (uptime robots, dashboards).
 *
 * Опционально защищается HEALTH_SECRET env var.
 */

import { NextRequest, NextResponse } from 'next/server';
import { PlatformAgent } from '@/lib/agents/platform-agent';

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
    const health = await PlatformAgent.health();
    return NextResponse.json({
      ok: true,
      agents: {
        platform: {
          success_rate_24h: health.success_rate,
          status: health.success_rate >= 0.8 ? 'healthy' : 'degraded',
        },
      },
      platform: health.platform,
      ts: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'health check failed', ts: new Date().toISOString() },
      { status: 503 }
    );
  }
}
