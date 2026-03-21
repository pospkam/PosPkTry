/**
 * GET   /api/agents/approvals          — список одобрений (фильтр по status)
 * POST  /api/agents/approvals          — одобрить или отклонить
 * PATCH /api/agents/approvals          — назначить исполнителя / обновить статус исполнения
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/middleware';
import { approvalRequired } from '@/lib/agents/safeguards/approval-required';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

const ReviewSchema = z.object({
  approval_id: z.string().uuid(),
  action:      z.enum(['approve', 'reject']),
  notes:       z.string().max(500).optional(),
});

const ExecutionSchema = z.object({
  approval_id:       z.string().uuid(),
  executor_agent_id: z.string().max(50).optional(),
  executor_name:     z.string().max(100).optional(),
  execution_status:  z.enum(['assigned', 'in_progress', 'done', 'failed']).optional(),
  execution_notes:   z.string().max(1000).optional(),
  due_date:          z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
});

export async function GET(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  await approvalRequired.expireStale().catch(() => null);

  const statusFilter = new URL(req.url).searchParams.get('status') ?? 'pending';
  const validStatuses = ['pending', 'approved', 'rejected', 'expired', 'all'];
  const safeStatus = validStatuses.includes(statusFilter) ? statusFilter : 'pending';

  if (safeStatus === 'pending') {
    const pending = await approvalRequired.pending();
    return NextResponse.json({ success: true, data: pending, total: pending.length });
  }

  const whereClause = safeStatus === 'all' ? '' : `WHERE status = $1`;
  const queryParams = safeStatus === 'all' ? [] : [safeStatus];

  const rows = await pool.query(
    `SELECT id, action_type, description, context, status,
            requested_by, reviewed_by, reviewed_at, review_notes,
            executor_agent_id, executor_name, execution_status,
            execution_notes, due_date, completed_at, expires_at, created_at
     FROM agent_approvals ${whereClause}
     ORDER BY created_at DESC LIMIT 100`,
    queryParams
  );

  return NextResponse.json({ success: true, data: rows.rows, total: rows.rowCount ?? 0 });
}

export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: 'Некорректный JSON' }, { status: 400 });
  }

  const parsed = ReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Некорректные данные', details: parsed.error.issues }, { status: 400 });
  }

  const reviewerId = parseInt(authResult.userId, 10);

  if (parsed.data.action === 'approve') {
    await approvalRequired.approve(parsed.data.approval_id, reviewerId, parsed.data.notes);
  } else {
    await approvalRequired.reject(parsed.data.approval_id, reviewerId, parsed.data.notes);
  }

  return NextResponse.json({ success: true });
}

export async function PATCH(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: 'Некорректный JSON' }, { status: 400 });
  }

  const parsed = ExecutionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Некорректные данные', details: parsed.error.issues }, { status: 400 });
  }

  const { approval_id, executor_agent_id, executor_name,
          execution_status, execution_notes, due_date } = parsed.data;

  const updates: string[] = [];
  const params: unknown[] = [approval_id];

  if (executor_agent_id !== undefined) { params.push(executor_agent_id); updates.push(`executor_agent_id=$${params.length}`); }
  if (executor_name     !== undefined) { params.push(executor_name);     updates.push(`executor_name=$${params.length}`); }
  if (execution_status  !== undefined) { params.push(execution_status);  updates.push(`execution_status=$${params.length}`); }
  if (execution_notes   !== undefined) { params.push(execution_notes);   updates.push(`execution_notes=$${params.length}`); }
  if (due_date          !== undefined) { params.push(due_date);          updates.push(`due_date=$${params.length}`); }
  if (execution_status === 'done' || execution_status === 'failed') {
    updates.push('completed_at=NOW()');
  }

  if (updates.length === 0) {
    return NextResponse.json({ success: false, error: 'Нет данных для обновления' }, { status: 400 });
  }

  const result = await pool.query(
    `UPDATE agent_approvals SET ${updates.join(', ')} WHERE id=$1 RETURNING id, execution_status`,
    params
  );

  if (result.rowCount === 0) {
    return NextResponse.json({ success: false, error: 'Одобрение не найдено' }, { status: 404 });
  }

  // Лог события исполнения
  const eventType = execution_status === 'done' ? 'completed'
    : execution_status === 'failed'   ? 'failed'
    : executor_agent_id               ? 'assigned'
    : 'progress';

  await pool.query(
    `INSERT INTO approval_execution_log (approval_id, actor, event_type, message)
     VALUES ($1, $2, $3, $4)`,
    [
      approval_id,
      `admin:${authResult.userId}`,
      eventType,
      execution_notes ?? executor_name ?? execution_status ?? 'obновлено',
    ]
  ).catch(() => null); // таблица может не существовать на старом проде

  return NextResponse.json({ success: true, data: result.rows[0] });
}

