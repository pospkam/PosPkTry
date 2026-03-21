/**
 * GET  /api/agents/approvals          — очередь ожидающих одобрения
 * POST /api/agents/approvals          — одобрить или отклонить
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/middleware';
import { approvalRequired } from '@/lib/agents/safeguards/approval-required';

export const dynamic = 'force-dynamic';

const ReviewSchema = z.object({
  approval_id: z.string().uuid(),
  action:      z.enum(['approve', 'reject']),
  notes:       z.string().max(500).optional(),
});

export async function GET(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  // Истечь устаревшие — попутно
  await approvalRequired.expireStale().catch(() => null);

  const pending = await approvalRequired.pending();
  return NextResponse.json({ success: true, data: pending, total: pending.length });
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
