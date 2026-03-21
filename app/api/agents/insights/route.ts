/**
 * GET /api/agents/insights
 *
 * Паттерны успеха/ошибок + обратная связь пользователей.
 * Используется вкладкой Insights в /hub/admin/agents.
 * Требует роль admin.
 *
 * Query params:
 *   hours — глубина в часах (default 24, max 168)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/middleware';
import { PatternRecognition } from '@/lib/agents/learning/pattern-recognition';
import { FeedbackLoop } from '@/lib/agents/learning/feedback-loop';

export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  hours: z.coerce.number().min(1).max(168).default(24),
});

export async function GET(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const parsed = QuerySchema.safeParse({
    hours: req.nextUrl.searchParams.get('hours'),
  });
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Некорректные параметры' }, { status: 400 });
  }

  const { hours } = parsed.data;

  const [patterns, metrics, feedback, recentFeedback] = await Promise.all([
    new PatternRecognition().detectPatterns(hours),
    new PatternRecognition().analyzeIntents(hours),
    new FeedbackLoop().getSummary(hours),
    new FeedbackLoop().getRecent(10),
  ]);

  return NextResponse.json({
    success: true,
    data: { patterns, metrics, feedback, recentFeedback },
    meta: { hours },
  });
}
