/**
 * POST /api/agents/execute/[approvalId]
 *   SSE-стрим: запускает исполнение инициативы, шаги летят в реальном времени
 *
 * GET /api/agents/execute/[approvalId]
 *   Лог исполнения из approval_execution_log
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';
import { executeInitiative, type ExecutionTask, type StepLogger } from '@/lib/agents/execution/initiative-executor';

export const dynamic = 'force-dynamic';

// ── POST: trigger execution (SSE) ─────────────────────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ approvalId: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { approvalId } = await params;

  // Load approval
  const row = await pool.query(
    `SELECT id, action_type, description, context,
            executor_agent_id, execution_status, due_date, status
     FROM agent_approvals WHERE id = $1`,
    [approvalId]
  );

  if (!row.rows[0]) {
    return NextResponse.json({ error: 'Инициатива не найдена' }, { status: 404 });
  }

  const approval = row.rows[0];

  if (approval.status !== 'approved') {
    return NextResponse.json(
      { error: `Нельзя запустить: статус одобрения "${approval.status}" (нужен "approved")` },
      { status: 400 }
    );
  }

  if (['in_progress', 'done'].includes(approval.execution_status)) {
    return NextResponse.json(
      { error: `Уже выполняется или завершено (${approval.execution_status})` },
      { status: 409 }
    );
  }

  const task: ExecutionTask = {
    approval_id:      approval.id,
    executor_agent_id: approval.executor_agent_id ?? 'system',
    action_type:      approval.action_type,
    description:      approval.description ?? '',
    context:          (approval.context as Record<string, unknown>) ?? {},
    due_date:         approval.due_date ?? '',
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: object) => {
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // stream already closed
        }
      };

      try {
        send({ type: 'started', executor: task.executor_agent_id, action_type: task.action_type });

        const onStep: StepLogger = async (eventType, message) => {
          send({ type: 'step', event_type: eventType, message, ts: Date.now() });
        };

        const result = await executeInitiative(task, onStep);

        send({
          type: result.success ? 'done' : 'failed',
          result: {
            success:             result.success,
            changes_made:        result.changes_made,
            errors:              result.errors,
            rollback_available:  result.rollback_available,
            verification_passed: result.verification_passed,
          },
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        send({ type: 'failed', error: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}

// ── GET: return execution log ─────────────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ approvalId: string }> }
) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const { approvalId } = await params;

  const [log, approval] = await Promise.all([
    pool.query(
      `SELECT actor, event_type, message, created_at
       FROM approval_execution_log
       WHERE approval_id = $1
       ORDER BY created_at ASC`,
      [approvalId]
    ),
    pool.query(
      `SELECT execution_status, execution_notes, completed_at, executor_agent_id, executor_name
       FROM agent_approvals WHERE id = $1`,
      [approvalId]
    ),
  ]);

  return NextResponse.json({
    success:  true,
    status:   approval.rows[0] ?? null,
    log:      log.rows,
    total:    log.rowCount ?? 0,
  });
}
