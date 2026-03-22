/**
 * GET/POST /api/planner/preferences
 * Save and retrieve user trip preferences via AgentMemory.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAuth } from '@/lib/auth/middleware';
import { agentMemory } from '@/lib/agents/memory/agent-memory';

const PreferencesSchema = z.object({
  interests:    z.array(z.string()).min(1).max(20),
  fitnessLevel: z.string().min(1).max(50),
  budgetTier:   z.string().min(1).max(50),
  adults:       z.number().int().min(1).max(20),
});

export async function POST(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const userId = authResult.userId;

  try {
    const body = await req.json() as unknown;
    const parsed = PreferencesSchema.parse(body);

    const value = {
      interests:    parsed.interests,
      fitnessLevel: parsed.fitnessLevel,
      budgetTier:   parsed.budgetTier,
      adults:       parsed.adults,
      savedAt:      new Date().toISOString(),
    };

    await agentMemory.remember({
      agent_id:    'tourist-agency',
      memory_type: 'user_preference',
      key:         `user_${userId}_prefs`,
      value,
      confidence:  1.0,
      source:      'user_input',
    });

    return NextResponse.json({ success: true, data: value });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Некорректные параметры', details: err.errors },
        { status: 400 },
      );
    }
    const msg = err instanceof Error ? err.message : 'Ошибка сохранения предпочтений';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const authResult = await requireAuth(req);
  if (authResult instanceof NextResponse) return authResult;

  const userId = authResult.userId;

  try {
    const entry = await agentMemory.get('tourist-agency', 'user_preference', `user_${userId}_prefs`);

    if (!entry) {
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({ success: true, data: entry.value });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ошибка получения предпочтений';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
