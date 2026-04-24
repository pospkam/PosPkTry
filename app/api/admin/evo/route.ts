/**
 * GET /api/admin/evo — статистика Evo System
 * POST /api/admin/evo/feedback — фидбек на эволюционное изменение
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';
import { submitFeedback, getEvoStats } from '@/lib/agents/evo/feedback-loop';
import { runRescueScan } from '@/lib/agents/evo/rescue-agent';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const stats = await getEvoStats();

  // Также вернём текущий статус спасателя (quick check)
  const action = req.nextUrl.searchParams.get('action');
  if (action === 'rescue-scan') {
    const rescue = await runRescueScan();
    return NextResponse.json({ success: true, data: { ...stats, rescue } });
  }

  return NextResponse.json({ success: true, data: stats });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parsed = body as {
    evolution_id: string;
    outcome: 'success' | 'partial' | 'failure' | 'regression';
    impact_score: number;
    human_notes: string;
  };

  if (!parsed.evolution_id || !parsed.outcome) {
    return NextResponse.json({ error: 'evolution_id and outcome required' }, { status: 400 });
  }

  const result = await submitFeedback({
    evolution_id: parsed.evolution_id,
    outcome: parsed.outcome,
    impact_score: parsed.impact_score ?? 0,
    human_notes: parsed.human_notes ?? '',
  });

  return NextResponse.json({ success: true, data: result });
}
