/**
 * POST /api/agents/dispatch
 *
 * Маршрутизатор намерений через PlatformAgent.
 * Требует роль admin.
 *
 * Body: { message: string, userId?: number, role?: string }
 * Response: { success: true, intent, response, duration_ms }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/middleware';
import { PlatformAgent } from '@/lib/agents/platform-agent';

export const dynamic = 'force-dynamic';

const DispatchSchema = z.object({
  message: z.string().min(1).max(1000),
  userId: z.number().int().positive().optional(),
  role: z.string().max(50).optional(),
  sessionId: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: 'Некорректный JSON' },
      { status: 400 }
    );
  }

  const parsed = DispatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Некорректные данные', details: parsed.error.issues },
      { status: 400 }
    );
  }

  const result = await PlatformAgent.dispatch({
    ...parsed.data,
    userId: parsed.data.userId ?? parseInt(authResult.userId, 10),
    role: parsed.data.role ?? authResult.role,
  });

  return NextResponse.json({ success: true, ...result });
}
