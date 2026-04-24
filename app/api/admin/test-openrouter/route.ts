/**
 * GET /api/admin/test-openrouter
 * Быстрая диагностика ключа OpenRouter.
 * Проверяет: ключ найден → аккаунт валиден → тестовый запрос → баланс.
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

interface Step {
  step: string;
  ok: boolean;
  detail: string;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  const steps: Step[] = [];

  // 1. Ключ найден в env
  const key = process.env.OR_API_KEY || process.env.OPENROUTER_API_KEY || null;
  const keyName = process.env.OR_API_KEY ? 'OR_API_KEY' : process.env.OPENROUTER_API_KEY ? 'OPENROUTER_API_KEY' : null;

  if (!key) {
    steps.push({ step: 'Ключ в env', ok: false, detail: 'Ни OR_API_KEY, ни OPENROUTER_API_KEY не заданы в Timeweb' });
    return NextResponse.json({ ok: false, steps });
  }

  const masked = key.slice(0, 12) + '...' + key.slice(-4);
  steps.push({ step: 'Ключ в env', ok: true, detail: `${keyName} = ${masked}` });

  // 2. Проверка аккаунта через /auth/key
  try {
    const authRes = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: { Authorization: `Bearer ${key}` },
      signal: AbortSignal.timeout(8_000),
    });

    const authBody = await authRes.json() as Record<string, unknown>;

    if (!authRes.ok) {
      steps.push({
        step: 'Аккаунт OpenRouter',
        ok: false,
        detail: `HTTP ${authRes.status}: ${JSON.stringify(authBody?.error ?? authBody)}`,
      });
      return NextResponse.json({ ok: false, steps });
    }

    const data = authBody.data as Record<string, unknown> | undefined;
    const limit = data?.limit_remaining ?? data?.limit ?? '?';
    const usage = data?.usage ?? '?';
    steps.push({
      step: 'Аккаунт OpenRouter',
      ok: true,
      detail: `Лимит остаток: ${limit}, использовано: ${usage}`,
    });
  } catch (e) {
    steps.push({ step: 'Аккаунт OpenRouter', ok: false, detail: `Таймаут/сеть: ${String(e)}` });
    return NextResponse.json({ ok: false, steps });
  }

  // 3. Тестовый LLM-запрос (минимальный)
  const model = 'openai/gpt-4o-mini';
  try {
    const t0 = Date.now();
    const chatRes = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
        'HTTP-Referer': 'https://tourhab.ru',
        'X-Title': 'TourHab Kamchatka',
      },
      body: JSON.stringify({
        model,
        max_tokens: 10,
        messages: [{ role: 'user', content: 'Reply with just: OK' }],
      }),
      signal: AbortSignal.timeout(15_000),
    });

    const ms = Date.now() - t0;
    const chatBody = await chatRes.json() as Record<string, unknown>;

    if (!chatRes.ok) {
      const err = chatBody?.error as Record<string, unknown> | undefined;
      steps.push({
        step: `LLM-запрос (${model})`,
        ok: false,
        detail: `HTTP ${chatRes.status}: ${err?.message ?? JSON.stringify(err)}`,
      });
      return NextResponse.json({ ok: false, steps });
    }

    const choices = chatBody?.choices as Array<{ message: { content: string } }> | undefined;
    const reply = choices?.[0]?.message?.content?.trim() ?? '(пусто)';
    steps.push({
      step: `LLM-запрос (${model})`,
      ok: true,
      detail: `Ответ: "${reply}" за ${ms}мс`,
    });
  } catch (e) {
    steps.push({
      step: `LLM-запрос (${model})`,
      ok: false,
      detail: `Таймаут/сеть: ${String(e)}`,
    });
    return NextResponse.json({ ok: false, steps });
  }

  return NextResponse.json({ ok: true, steps });
}
