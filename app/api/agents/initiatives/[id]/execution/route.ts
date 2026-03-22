/**
 * PUT /api/agents/initiatives/[id]/execution
 *
 * Обновить статус исполнения инициативы.
 * Директор может обновить статус, программы должны регистрировать свой прогресс.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { ExecutionTracker } from '@/lib/agents/execution/execution-tracker';
import { z } from 'zod';

const UpdateExecutionSchema = z.object({
  status: z.enum(['assigned', 'in_progress', 'done', 'failed', 'blocked']),
  progress_pct: z.number().min(0).max(100).optional(),
  failure_reason: z.string().max(500).optional(),
  notes: z.string().max(1000).optional(),
});

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const body = await req.json();
    const validated = UpdateExecutionSchema.parse(body);

    const { status, progress_pct, failure_reason, notes } = validated;

    await ExecutionTracker.updateExecutionStatus(params.id, status, {
      progress_pct,
      failure_reason,
      notes,
    });

    return NextResponse.json({
      success: true,
      initiative_id: params.id,
      execution_status: status,
      updated_at: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 400 });
  }
}

/**
 * GET /api/agents/initiatives/[id]/execution
 *
 * Получить статус исполнения инициативы.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  try {
    const initiatives = await ExecutionTracker.getLastMeetingInitiatives();
    const initiative = initiatives.find(i => i.initiative_id === params.id);

    if (!initiative) {
      return NextResponse.json(
        { error: 'Initiative not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(initiative);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
