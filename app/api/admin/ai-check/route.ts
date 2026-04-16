/**
 * GET /api/admin/ai-check
 * Диагностика AI-провайдеров — показывает какие ключи есть и кто отвечает.
 * Требует: роль admin
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import {
  callOpenrouter,
  callMinimax,
  callXai,
  callAnthropic,
} from '@/lib/ai/providers';
import type { ChatMessage } from '@/lib/ai/prompts';

export const dynamic = 'force-dynamic';

const PING: ChatMessage[] = [
  { role: 'system', content: 'Ты помощник. Отвечай одним словом.' },
  { role: 'user',   content: 'Скажи только: ок' },
];

async function probe(fn: () => Promise<string | null>): Promise<{ ok: boolean; answer?: string; ms: number }> {
  const t = Date.now();
  try {
    const answer = await fn();
    return { ok: !!answer, answer: answer?.slice(0, 60) ?? undefined, ms: Date.now() - t };
  } catch (e) {
    return { ok: false, answer: e instanceof Error ? e.message : 'exception', ms: Date.now() - t };
  }
}

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError instanceof NextResponse) return authError;

  const [openrouter, minimax, xai, anthropic] = await Promise.all([
    probe(() => callOpenrouter(PING)),
    probe(() => callMinimax(PING)),
    probe(() => callXai(PING)),
    probe(() => callAnthropic(PING)),
  ]);

  const env = {
    OPENROUTER_API_KEY:    !!process.env.OPENROUTER_API_KEY,
    MINIMAX_API_KEY:       !!process.env.MINIMAX_API_KEY,
    XAI_API_KEY:           !!process.env.XAI_API_KEY,
    ANTHROPIC_API_KEY:     !!process.env.ANTHROPIC_API_KEY,
  };

  const anyWorking = openrouter.ok || minimax.ok || xai.ok || anthropic.ok;

  return NextResponse.json({
    success: true,
    overall: anyWorking ? 'ok' : 'all_failed',
    env,
    providers: { openrouter, minimax, xai, anthropic },
  });
}
