/**
 * GET  /api/admin/ai-prompts — список системных промптов агентов
 * POST /api/admin/ai-prompts — тест промпта с произвольным вводом
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { callAIFast } from '@/lib/ai/providers';
import { z } from 'zod';
import { KUZMICH_SYSTEM } from '@/lib/kuzmich/core';
import type { ChatMessage } from '@/lib/ai/prompts';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Реестр промптов: id → { label, source, content }
function buildRegistry() {
  const entries: Array<{ id: string; label: string; source: string; preview: string; charCount: number }> = [];

  const add = (id: string, label: string, source: string, content: string) => {
    entries.push({ id, label, source, preview: content.slice(0, 200).replace(/\n/g, ' '), charCount: content.length });
  };

  add('kuzmich', 'Kuzmich — Telegram/Web-chat', 'lib/kuzmich/core.ts', KUZMICH_SYSTEM);

  return entries;
}

// ── GET: список промптов ───────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  return NextResponse.json({ ok: true, prompts: buildRegistry() });
}

// ── POST: тестирование промпта ─────────────────────────────────────────────────

const TestSchema = z.object({
  prompt_id:  z.string(),
  user_input: z.string().min(1).max(1000),
  variant:    z.string().optional(), // альтернативный вариант промпта для A/B
});

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const { prompt_id, user_input, variant } = TestSchema.parse(body);

  // Находим промпт
  const registry = buildRegistry();
  const entry = registry.find(p => p.id === prompt_id);
  if (!entry) {
    return NextResponse.json({ ok: false, error: 'Промпт не найден' }, { status: 404 });
  }

  // Получаем полный промпт
  const fullPrompt = getFullPrompt(prompt_id);

  const messages: ChatMessage[] = [
    { role: 'system', content: variant ?? fullPrompt },
    { role: 'user',   content: user_input },
  ];

  const started = Date.now();
  const response = await callAIFast(messages);
  const latencyMs = Date.now() - started;

  // Если есть variant — сравниваем
  let originalResponse: string | null = null;
  let originalMs: number | null = null;
  if (variant) {
    const origStart = Date.now();
    const origMessages: ChatMessage[] = [
      { role: 'system', content: fullPrompt },
      { role: 'user',   content: user_input },
    ];
    originalResponse = await callAIFast(origMessages);
    originalMs = Date.now() - origStart;
  }

  return NextResponse.json({
    ok:             true,
    prompt_id,
    user_input,
    response,
    latency_ms:     latencyMs,
    char_count:     entry.charCount,
    ...(variant ? {
      comparison: {
        original:      originalResponse,
        original_ms:   originalMs,
        variant:       response,
        variant_ms:    latencyMs,
      }
    } : {}),
  });
}

function getFullPrompt(promptId: string): string {
  if (promptId === 'kuzmich') return KUZMICH_SYSTEM;
  return '';
}
