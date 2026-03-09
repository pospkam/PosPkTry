/**
 * GET /api/ai/health
 * Диагностика AI-провайдеров — показывает какие ключи есть и работает ли Anthropic.
 * Используется для отладки на продакшен окружении.
 */

import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

async function testAnthropic(key: string): Promise<{ ok: boolean; status: number; error?: string }> {
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 10,
        messages: [{ role: 'user', content: 'ping' }],
      }),
    });
    if (res.ok) return { ok: true, status: res.status };
    const body = await res.text().catch(() => '');
    return { ok: false, status: res.status, error: body.slice(0, 200) };
  } catch (e) {
    return { ok: false, status: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET() {
  const keys = {
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    MINIMAX_API_KEY: process.env.MINIMAX_API_KEY,
    XAI_API_KEY: process.env.XAI_API_KEY,
    OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  };

  const keySummary = Object.fromEntries(
    Object.entries(keys).map(([k, v]) => [
      k,
      v ? `SET (${v.length} chars, prefix: ${v.slice(0, 8)}...)` : 'MISSING',
    ])
  );

  let anthropicTest: { ok: boolean; status: number; error?: string } | null = null;
  if (keys.ANTHROPIC_API_KEY) {
    anthropicTest = await testAnthropic(keys.ANTHROPIC_API_KEY);
  }

  return NextResponse.json({
    keys: keySummary,
    anthropicTest,
    nodeVersion: process.version,
    env: process.env.NODE_ENV,
  });
}
