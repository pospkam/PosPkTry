/**
 * POST /api/agents/operator
 *
 * AI Agent endpoint for operators.
 * Allows only op_* intents.
 * Requires operator role (JWT auth_token cookie).
 *
 * Body: { message: string, tourId?: number }
 * Response: { success, intent, response, data }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireRole } from '@/lib/auth/middleware';
import { PlatformAgent } from '@/lib/agents/platform-agent';
import { canDispatchIntent } from '@/lib/agents/permissions';

export const dynamic = 'force-dynamic';

const Schema = z.object({
  message: z.string().min(1).max(2000),
  tourId: z.number().int().positive().optional(),
  sessionId: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  const authResult = await requireRole(req, ['operator']);
  if (authResult instanceof NextResponse) return authResult;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Некорректный JSON' }, { status: 400 });
  }

  const parsed = Schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Некорректные данные', details: parsed.error.issues },
      { status: 400 }
    );
  }

  // Build message: if tourId passed, prepend it
  let message = parsed.data.message;
  if (parsed.data.tourId) {
    message = `${message} тур ${parsed.data.tourId}`;
  }

  // Dispatch via PlatformAgent
  const result = await PlatformAgent.dispatch({
    message,
    userId: parseInt(authResult.userId, 10),
    role: 'operator',
    sessionId: parsed.data.sessionId,
  });

  // Permission gate: only op_* allowed
  if (!canDispatchIntent('operator', result.intent)) {
    return NextResponse.json(
      { success: false, error: 'Недостаточно прав для этого намерения' },
      { status: 403 }
    );
  }

  return NextResponse.json({ success: true, ...result });
}
