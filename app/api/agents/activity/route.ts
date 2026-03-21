/**
 * GET /api/agents/activity
 *
 * Последние наблюдения агентной системы из ai_actions_log.
 * Требует роль admin.
 *
 * Query params:
 *   hours  — глубина в часах (default 24, max 168)
 *   limit  — количество записей (default 50, max 200)
 *   agent  — фильтр по agent_name (без префикса 'agent_')
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';
import { PlatformAgent } from '@/lib/agents/platform-agent';

export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  hours: z.coerce.number().min(1).max(168).default(24),
  limit: z.coerce.number().min(1).max(200).default(50),
  agent: z.string().max(50).optional(),
});

interface ObservationRow {
  id: string;
  action_type: string;
  metadata: Record<string, unknown>;
  created_at: Date;
}

export async function GET(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const { searchParams } = req.nextUrl;
  const parsed = QuerySchema.safeParse({
    hours: searchParams.get('hours'),
    limit: searchParams.get('limit'),
    agent: searchParams.get('agent'),
  });
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Некорректные параметры' },
      { status: 400 }
    );
  }

  const { hours, limit, agent } = parsed.data;
  const actionType = agent ? `agent_${agent}` : null;

  const { rows } = await pool.query<ObservationRow>(
    `SELECT id, action_type, metadata, created_at
     FROM ai_actions_log
     WHERE created_at >= NOW() - ($1 || ' hours')::interval
       AND action_type LIKE 'agent_%'
       AND ($2::text IS NULL OR action_type = $2)
     ORDER BY created_at DESC
     LIMIT $3`,
    [hours, actionType, limit]
  );

  // Агрегация по результату
  const total   = rows.length;
  const success = rows.filter(r => r.metadata?.result === 'success').length;
  const fail    = rows.filter(r => r.metadata?.result === 'fail').length;

  // Статистика здоровья
  const healthData = await PlatformAgent.health();

  return NextResponse.json({
    success: true,
    data: rows,
    stats: {
      total,
      success,
      fail,
      success_rate: total > 0 ? Math.round((success / total) * 100) : null,
      success_rate_24h: Math.round(healthData.success_rate * 100),
      platform: healthData.platform,
    },
  });
}
