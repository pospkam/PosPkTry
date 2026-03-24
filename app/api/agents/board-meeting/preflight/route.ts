import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { preflightProviders } from '@/lib/ai/providers';
import { getComputeFundStats } from '@/lib/compute-fund';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agents/board-meeting/preflight
 * Быстрая проверка доступности AI-провайдеров + баланс фонда токенов.
 * ?deep=1 для полного теста с реальным промптом.
 */
export async function GET(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const deep = req.nextUrl.searchParams.get('deep') === '1';

  const [result, fund] = await Promise.all([
    preflightProviders(),
    getComputeFundStats().catch(() => null),
  ]);

  let deepTest = null;
  if (deep) {
    deepTest = await runDeepTest();
  }

  return NextResponse.json({
    success: true,
    ...result,
    compute_fund: fund ? {
      total_rub:         fund.total_contributed_rub,
      estimated_meetings: fund.estimated_meetings,
      estimated_chats:    fund.estimated_chats,
    } : null,
    deep_test: deepTest,
  });
}

/** Test each OpenRouter model with a real prompt (not just 'ok') */
async function runDeepTest() {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return { error: 'OPENROUTER_API_KEY not set' };

  const models = [
    'openai/gpt-4o-mini',
    'deepseek/deepseek-chat-v3-0324',
    'google/gemini-2.0-flash-001',
    'anthropic/claude-haiku-4-5',
  ];
  const testPrompt = [
    { role: 'system' as const, content: 'You are a helpful assistant. Reply in one sentence.' },
    { role: 'user' as const, content: 'What is 2+2? Reply with a number.' },
  ];

  const results: Array<{ model: string; status: string; latency_ms: number; response?: string; error?: string }> = [];

  for (const model of models) {
    const start = Date.now();
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://tourhab.ru',
          'X-Title': 'TourHab Kamchatka',
        },
        body: JSON.stringify({
          model,
          temperature: 0.1,
          max_tokens: 50,
          messages: testPrompt,
        }),
        signal: AbortSignal.timeout(15000),
      });

      const latency = Date.now() - start;
      const body = await res.text();

      if (!res.ok) {
        results.push({ model, status: `HTTP ${res.status}`, latency_ms: latency, error: body.slice(0, 300) });
        continue;
      }

      try {
        const data = JSON.parse(body);
        if (data?.error) {
          results.push({ model, status: 'error_in_body', latency_ms: latency, error: JSON.stringify(data.error).slice(0, 300) });
          continue;
        }
        const text = data?.choices?.[0]?.message?.content;
        results.push({ model, status: 'ok', latency_ms: latency, response: (text ?? '').slice(0, 100) });
      } catch {
        results.push({ model, status: 'parse_error', latency_ms: latency, error: body.slice(0, 200) });
      }
    } catch (e) {
      results.push({ model, status: 'exception', latency_ms: Date.now() - start, error: String(e).slice(0, 200) });
    }
  }

  // Also test env vars presence
  const envCheck = {
    OPENROUTER_API_KEY: !!process.env.OPENROUTER_API_KEY,
    XIAOMI_API_KEY: !!process.env.XIAOMI_API_KEY,
    YANDEX_API_KEY: !!process.env.YANDEX_API_KEY,
    DEEPSEEK_API_KEY: !!process.env.DEEPSEEK_API_KEY,
    GEMINI_API_KEY: !!process.env.GEMINI_API_KEY,
    XAI_API_KEY: !!process.env.XAI_API_KEY,
    ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
  };

  return { models: results, env_keys_set: envCheck };
}
