/**
 * GET /api/ai/health?token=kamhub-debug-2026
 * Диагностика AI-провайдеров в продакшене.
 * Требует debug-токен в query string.
 */

import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const DEBUG_TOKEN = 'kamhub-debug-2026';

async function testProvider(
  name: string,
  fn: () => Promise<Response>
): Promise<{ name: string; ok: boolean; status: number; error?: string; answer?: string }> {
  try {
    const res = await fn();
    if (res.ok) {
      const data: unknown = await res.json();
      const answer =
        (data as { choices?: Array<{ message?: { content?: string } }> })?.choices?.[0]?.message?.content ??
        (data as { content?: Array<{ text?: string }> })?.content?.[0]?.text ??
        'ok';
      return { name, ok: true, status: res.status, answer: String(answer).slice(0, 60) };
    }
    const body = await res.text().catch(() => '');
    return { name, ok: false, status: res.status, error: body.slice(0, 200) };
  } catch (e) {
    return { name, ok: false, status: 0, error: e instanceof Error ? e.message : String(e) };
  }
}

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token');
  if (token !== DEBUG_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const deepseekKey = process.env.DEEPSEEK_API_KEY;
  const minimaxKey = process.env.MINIMAX_API_KEY;
  const xaiKey = process.env.XAI_API_KEY;
  const anthropicKey = process.env.ANTHROPIC_API_KEY;

  const keySummary = {
    DEEPSEEK_API_KEY: deepseekKey ? `SET (${deepseekKey.length}ch, ${deepseekKey.slice(0, 8)}...)` : 'MISSING',
    MINIMAX_API_KEY: minimaxKey ? `SET (${minimaxKey.length}ch, ${minimaxKey.slice(0, 8)}...)` : 'MISSING',
    XAI_API_KEY: xaiKey ? `SET (${xaiKey.length}ch, ${xaiKey.slice(0, 8)}...)` : 'MISSING',
    ANTHROPIC_API_KEY: anthropicKey ? `SET (${anthropicKey.length}ch, ${anthropicKey.slice(0, 8)}...)` : 'MISSING',
    DATABASE_URL: process.env.DATABASE_URL ? 'SET' : 'MISSING',
    JWT_SECRET: process.env.JWT_SECRET ? 'SET' : 'MISSING',
  };

  const tests = await Promise.all([
    deepseekKey
      ? testProvider('DeepSeek', () =>
          fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${deepseekKey}` },
            body: JSON.stringify({ model: 'deepseek-chat', max_tokens: 20, messages: [{ role: 'user', content: 'ping' }] }),
          })
        )
      : { name: 'DeepSeek', ok: false, status: 0, error: 'DEEPSEEK_API_KEY MISSING' },

    minimaxKey
      ? testProvider('MiniMax', () =>
          fetch('https://api.minimaxi.chat/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${minimaxKey}` },
            body: JSON.stringify({ model: 'MiniMax-Text-01', max_tokens: 20, messages: [{ role: 'user', content: 'ping' }] }),
          })
        )
      : { name: 'MiniMax', ok: false, status: 0, error: 'MINIMAX_API_KEY MISSING' },

    xaiKey
      ? testProvider('xAI grok-4', () =>
          fetch('https://api.x.ai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${xaiKey}` },
            body: JSON.stringify({ model: 'grok-4', max_tokens: 20, messages: [{ role: 'user', content: 'ping' }] }),
          })
        )
      : { name: 'xAI grok-4', ok: false, status: 0, error: 'XAI_API_KEY MISSING' },
  ]);

  return NextResponse.json({
    keys: keySummary,
    providerTests: tests,
    nodeVersion: process.version,
    nodeEnv: process.env.NODE_ENV,
  });
}
