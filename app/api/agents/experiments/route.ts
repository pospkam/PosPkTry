/**
 * GET  /api/agents/experiments        — список экспериментов
 * POST /api/agents/experiments        — создать эксперимент
 * PATCH /api/agents/experiments?id=   — обновить статус/победителя
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/middleware';
import { ExperimentTracker } from '@/lib/agents/learning/experiment-tracker';
import { auditLog } from '@/lib/agents/safeguards/audit-log';

export const dynamic = 'force-dynamic';

const CreateSchema = z.object({
  name:        z.string().min(1).max(200),
  description: z.string().max(500).optional(),
  intent:      z.string().max(100).optional(),
  variant_a:   z.record(z.unknown()),
  variant_b:   z.record(z.unknown()),
  metric:      z.string().max(50).optional(),
});

const PatchSchema = z.object({
  status: z.enum(['running', 'paused', 'completed']).optional(),
  winner: z.enum(['a', 'b', 'tie']).optional(),
});

const tracker = new ExperimentTracker();

export async function GET(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const status = req.nextUrl.searchParams.get('status') ?? undefined;
  const id     = req.nextUrl.searchParams.get('id');

  if (id) {
    const [exp, results] = await Promise.all([
      tracker.getById(id),
      tracker.calculateResults(id),
    ]);
    if (!exp) return NextResponse.json({ success: false, error: 'Не найден' }, { status: 404 });
    return NextResponse.json({ success: true, data: exp, results });
  }

  const list = await tracker.list(status);
  return NextResponse.json({ success: true, data: list });
}

export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: 'Некорректный JSON' }, { status: 400 });
  }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Некорректные данные', details: parsed.error.issues }, { status: 400 });
  }

  const exp = await tracker.create(parsed.data);

  await auditLog.write({
    event_type: 'experiment_created',
    actor:      authResult.userId,
    resource:   exp.id,
    details:    { name: exp.name, intent: exp.intent },
  });

  return NextResponse.json({ success: true, data: exp }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const id = req.nextUrl.searchParams.get('id');
  if (!id) return NextResponse.json({ success: false, error: 'id required' }, { status: 400 });

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ success: false, error: 'Некорректный JSON' }, { status: 400 });
  }

  const parsed = PatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Некорректные данные' }, { status: 400 });
  }

  if (parsed.data.status) {
    await tracker.updateStatus(id, parsed.data.status, parsed.data.winner);
    if (parsed.data.status === 'completed') {
      await auditLog.write({
        event_type: 'experiment_concluded',
        actor:      authResult.userId,
        resource:   id,
        details:    { winner: parsed.data.winner },
      });
    }
  }

  return NextResponse.json({ success: true });
}
