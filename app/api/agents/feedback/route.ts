/**
 * POST /api/agents/feedback
 *
 * Логирует пользовательскую оценку результата агента.
 * Основа для Learning Layer (Нед. 3-4).
 *
 * Body: { observationId?: string, rating: 'good'|'bad', comment?: string, intent?: string }
 * Response: { success: true }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

const FeedbackSchema = z.object({
  observationId: z.string().uuid().optional(),
  rating: z.enum(['good', 'bad']),
  comment: z.string().max(500).optional(),
  intent: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
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

  const parsed = FeedbackSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Некорректные данные', details: parsed.error.issues },
      { status: 400 }
    );
  }

  await pool.query(
    `INSERT INTO ai_actions_log (action_type, metadata)
     VALUES ('agent_feedback', $1)`,
    [
      JSON.stringify({
        observation_id: parsed.data.observationId,
        rating: parsed.data.rating,
        comment: parsed.data.comment,
        intent: parsed.data.intent,
        user_id: authResult.userId,
      }),
    ]
  );

  return NextResponse.json({ success: true });
}
