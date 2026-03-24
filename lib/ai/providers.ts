/**
 * Shared AI provider functions — waterfall pattern.
 * MiMo-V2-Pro (Xiaomi) → OpenRouter (GPT-4o-mini) → xAI (Grok) → Anthropic (Haiku)
 *
 * Env vars:
 *   XIAOMI_API_KEY          — Xiaomi MiMo ($1/1M tokens, 1M context)
 *   OPENROUTER_API_KEY      — OpenRouter GPT-4o-mini
 *   XAI_API_KEY             — xAI Grok-4
 *   ANTHROPIC_API_KEY       — Claude Haiku (fallback)
 *   MINIMAX_API_KEY         — Minimax (резерв, отдельный от основного waterfall)
 */

import type { ChatMessage } from '@/lib/ai/prompts';

// ── Xiaomi MiMo-V2-Pro ────────────────────────────────────────
export async function callMiMo(messages: ChatMessage[]): Promise<string | null> {
  const apiKey = process.env.XIAOMI_API_KEY;
  if (!apiKey) return null;

  try {
    const payload = messages.map(({ role, content }) => ({ role, content }));
    const res = await fetch('https://api.xiaomimimo.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'MiMo-V2-Pro',
        temperature: 0.4,
        max_tokens: 800,
        messages: payload,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return null;
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch (e) {
    return null;
  }
}

// ── OpenRouter ─────────────────────────────────────────────────
// Пробует несколько моделей по очереди — защита от rate limit одной модели.
// Порядок: GPT-4o-mini → DeepSeek V3 → Claude Haiku (через OR-прокси, без геоблока)
const OR_MODELS = [
  { id: 'openai/gpt-4o-mini',                timeout: 15_000 },
  { id: 'deepseek/deepseek-chat-v3-0324',    timeout: 15_000 },
  { id: 'anthropic/claude-haiku-4-5',        timeout: 20_000 },
];

export async function callOpenrouter(messages: ChatMessage[]): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  const payload = messages.map(({ role, content }) => ({ role, content }));

  for (const { id, timeout } of OR_MODELS) {
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
          model: id,
          temperature: 0.4,
          max_tokens: 800,
          messages: payload,
        }),
        signal: AbortSignal.timeout(timeout),
      });

      if (!res.ok) continue; // следующая модель
      const data = await res.json();
      const text: string | undefined = data?.choices?.[0]?.message?.content;
      if (text?.trim()) return text;
    } catch { continue; }
  }

  return null;
}

// ── Minimax ────────────────────────────────────────────────────
export async function callMinimax(messages: ChatMessage[]): Promise<string | null> {
  const apiKey = process.env.MINIMAX_API_KEY;
  if (!apiKey) return null;

  try {
    const systemMsg = messages.find(m => m.role === 'system');
    const turns = messages.filter(m => m.role !== 'system');
    const payload = turns.map(({ role, content }) => ({
      role: role === 'assistant' ? 'assistant' : 'user',
      content,
    }));

    const res = await fetch('https://api.minimaxi.chat/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'MiniMax-Text-01',
        temperature: 0.4,
        max_tokens: 800,
        ...(systemMsg ? { system_prompt: systemMsg.content } : {}),
        messages: payload,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return null;
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch (e) {
    return null;
  }
}

// ── xAI (Grok) ────────────────────────────────────────────────
export async function callXai(messages: ChatMessage[]): Promise<string | null> {
  const apiKey = process.env.XAI_API_KEY;
  if (!apiKey) return null;

  try {
    const payload = messages.map(({ role, content }) => ({ role, content }));
    const res = await fetch('https://api.x.ai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'grok-4',
        temperature: 0.4,
        max_tokens: 800,
        messages: payload,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return null;
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch (e) {
    return null;
  }
}

// ── Anthropic Claude (direct API) ───────────────────────────
export async function callAnthropic(messages: ChatMessage[]): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  try {
    const systemMsg = messages.find(m => m.role === 'system');
    const turns = messages.filter(m => m.role !== 'system');
    const firstUserIdx = turns.findIndex(m => m.role === 'user');
    const clean = firstUserIdx >= 0 ? turns.slice(firstUserIdx) : turns;
    const window = clean.slice(-6);
    const startIdx = window.findIndex(m => m.role === 'user');
    const trimmed = startIdx > 0 ? window.slice(startIdx) : window;

    if (!trimmed.length) return null;

    const anthropicMessages = trimmed.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 800,
        temperature: 0.4,
        ...(systemMsg ? { system: systemMsg.content } : {}),
        messages: anthropicMessages,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      return null;
    }

    const data: unknown = await res.json();
    if (
      data !== null &&
      typeof data === 'object' &&
      'content' in data &&
      Array.isArray((data as Record<string, unknown>).content)
    ) {
      const content = (data as { content: Array<Record<string, unknown>> }).content;
      const item = content[0];
      return typeof item?.text === 'string' ? item.text : null;
    }
    return null;
  } catch (e) {
    return null;
  }
}

// ── Google Gemini (via OpenRouter) ────────────────────────────
export async function callGemini(messages: ChatMessage[]): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  try {
    const systemMsg = messages.find(m => m.role === 'system');
    const turns = messages.filter(m => m.role !== 'system');
    const payload = turns.map(({ role, content }) => ({
      role: role === 'assistant' ? 'assistant' : 'user',
      content,
    }));

    if (systemMsg) {
      payload.unshift({ role: 'user', content: `[System]: ${systemMsg.content}` });
    }

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://tourhab.ru',
        'X-Title': 'TourHab Kamchatka',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.0-flash-001',
        temperature: 0.4,
        max_tokens: 1200,
        messages: payload,
      }),
      signal: AbortSignal.timeout(20_000),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch {
    return null;
  }
}

// ── Preflight: быстрая проверка доступности провайдеров ──────
// Минимальный запрос к каждому провайдеру, параллельно, 5s timeout
export interface ProviderStatus {
  id: string;
  name: string;
  available: boolean;
  latency_ms?: number;
  error?: string;
}

export interface OpenRouterBalance {
  total_credits: number;
  total_usage: number;
  remaining: number;
  low: boolean;
}

/**
 * Проверяет баланс OpenRouter.
 *
 * Приоритет:
 *   1. OPENROUTER_MANAGEMENT_KEY → /api/v1/credits  (точный баланс, management key)
 *   2. OPENROUTER_API_KEY        → /api/v1/auth/key  (usage/limit, стандартный ключ)
 *
 * Добавь в Timeweb env:
 *   OPENROUTER_MANAGEMENT_KEY=sk-or-v1-mgmt-...
 */
export async function checkOpenRouterBalance(): Promise<OpenRouterBalance | null> {
  const mgmtKey = process.env.OPENROUTER_MANAGEMENT_KEY;
  const apiKey  = process.env.OPENROUTER_API_KEY;

  // ── Вариант 1: management key → /api/v1/credits ──────────────
  if (mgmtKey) {
    try {
      const res = await fetch('https://openrouter.ai/api/v1/credits', {
        headers: { Authorization: `Bearer ${mgmtKey}` },
        signal: AbortSignal.timeout(5000),
      });
      if (res.ok) {
        const json = await res.json() as {
          data: { total_credits: number; total_usage: number }
        };
        const { total_credits, total_usage } = json.data;
        const remaining = Math.round((total_credits - total_usage) * 100) / 100;
        return {
          total_credits: Math.round(total_credits * 100) / 100,
          total_usage:   Math.round(total_usage   * 100) / 100,
          remaining,
          low: remaining < 0.5,
        };
      }
    } catch { /* fallthrough */ }
  }

  // ── Вариант 2: стандартный API key → /api/v1/auth/key ────────
  if (!apiKey) return null;
  try {
    const res = await fetch('https://openrouter.ai/api/v1/auth/key', {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) return null;
    const json = await res.json() as {
      data: { usage: number; limit: number | null }
    };
    const { usage, limit } = json.data;
    const remaining = limit != null ? Math.round((limit - usage) * 100) / 100 : null;
    return {
      total_credits: limit ?? 0,
      total_usage:   Math.round(usage * 100) / 100,
      remaining:     remaining ?? 999, // null limit = pay-as-you-go
      low:           remaining != null && remaining < 0.5,
    };
  } catch {
    return null;
  }
}

export async function preflightProviders(): Promise<{
  providers: ProviderStatus[];
  any_available: boolean;
  openrouter_balance: OpenRouterBalance | null;
}> {
  const testMsg: ChatMessage[] = [{ role: 'user', content: 'ok' }];

  // Пробует провайдера и возвращает подробный статус (HTTP-код + тело ошибки)
  async function probeDetailed(
    id:     string,
    name:   string,
    fn:     () => Promise<{ ok: boolean; status?: number; error?: string }>,
  ): Promise<ProviderStatus> {
    const start = Date.now();
    try {
      const result = await Promise.race([
        fn(),
        new Promise<{ ok: boolean; error: string }>((resolve) =>
          setTimeout(() => resolve({ ok: false, error: 'timeout 5s' }), 5000),
        ),
      ]);
      return {
        id,
        name,
        available:  result.ok,
        latency_ms: Date.now() - start,
        error:      result.ok ? undefined : result.error,
      };
    } catch (e) {
      return { id, name, available: false, latency_ms: Date.now() - start, error: String(e) };
    }
  }

  async function probeMiMo() {
    const apiKey = process.env.XIAOMI_API_KEY;
    if (!apiKey) return { ok: false, error: 'XIAOMI_API_KEY not set' };
    try {
      const res = await fetch('https://api.xiaomimimo.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'MiMo-V2-Pro', max_tokens: 5, messages: testMsg }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return { ok: false, status: res.status, error: `HTTP ${res.status}: ${body.slice(0, 120)}` };
      }
      return { ok: true };
    } catch (e) { return { ok: false, error: String(e) }; }
  }

  async function probeOpenrouter() {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return { ok: false, error: 'OPENROUTER_API_KEY not set' };
    try {
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://tourhab.ru',
          'X-Title': 'TourHab Kamchatka',
        },
        body: JSON.stringify({ model: 'openai/gpt-4o-mini', max_tokens: 5, messages: testMsg }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return { ok: false, status: res.status, error: `HTTP ${res.status}: ${body.slice(0, 200)}` };
      }
      return { ok: true };
    } catch (e) { return { ok: false, error: String(e) }; }
  }

  async function probeXai() {
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) return { ok: false, error: 'XAI_API_KEY not set' };
    try {
      const res = await fetch('https://api.x.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'grok-4', max_tokens: 5, messages: testMsg }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return { ok: false, status: res.status, error: `HTTP ${res.status}: ${body.slice(0, 120)}` };
      }
      return { ok: true };
    } catch (e) { return { ok: false, error: String(e) }; }
  }

  async function probeAnthropic() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) return { ok: false, error: 'ANTHROPIC_API_KEY not set' };
    try {
      const res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 5,
          messages: [{ role: 'user', content: 'ok' }],
        }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return { ok: false, status: res.status, error: `HTTP ${res.status}: ${body.slice(0, 120)}` };
      }
      return { ok: true };
    } catch (e) { return { ok: false, error: String(e) }; }
  }

  const [providers, openrouter_balance] = await Promise.all([
    Promise.all([
      probeDetailed('mimo',       'MiMo-V2-Pro (Xiaomi)',        probeMiMo),
      probeDetailed('openrouter', 'OpenRouter (GPT-4o-mini)',     probeOpenrouter),
      probeDetailed('xai',        'Grok-4 (xAI)',                 probeXai),
      probeDetailed('anthropic',  'Claude Haiku (Anthropic)',     probeAnthropic),
    ]),
    checkOpenRouterBalance(),
  ]);

  return {
    providers,
    any_available: providers.some(p => p.available),
    openrouter_balance,
  };
}

// ── Waterfall: пробует провайдеров по очереди ─────────────────
// MiMo-V2-Pro → OpenRouter → xAI → Anthropic
export async function callAIWaterfall(messages: ChatMessage[]): Promise<string> {
  let answer = await callMiMo(messages);
  if (!answer) answer = await callOpenrouter(messages);
  if (!answer) answer = await callXai(messages);
  if (!answer) answer = await callAnthropic(messages);
  return answer ?? 'Извините, сервис временно недоступен. Попробуйте позже.';
}

// ── Fast Waterfall — только дешёвые провайдеры ──────────────────
// Для структурированных задач (JSON, бинарные ответы, голосование).
// MiMo ($1/1M) → DeepSeek via OpenRouter ($0.27/1M).
// НЕ использует Grok-4 и Anthropic — только для high-stakes выводов.
export async function callAIFast(messages: ChatMessage[]): Promise<string> {
  // Попытка 1: MiMo-V2-Pro (самый дешёвый)
  const mimo = await callMiMo(messages);
  if (mimo) return mimo;

  // Попытка 2: DeepSeek через OpenRouter (~$0.27/1M tokens)
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (apiKey) {
    try {
      const payload = messages.map(({ role, content }) => ({ role, content }));
      const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://tourhab.ru',
          'X-Title': 'TourHab Kamchatka',
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-chat-v3-0324',
          temperature: 0.3,
          max_tokens: 600,
          messages: payload,
        }),
        signal: AbortSignal.timeout(12_000),
      });
      if (res.ok) {
        const data = await res.json();
        const text: string | undefined = data?.choices?.[0]?.message?.content;
        if (text) return text;
      }
    } catch { /* fallthrough */ }
  }

  return 'Сервис временно недоступен.';
}

// ── Waterfall Direct — алиас основного ────────────────────────
// Claude 4.6 на Timeweb корректно обрабатывает system prompt,
// поэтому отдельный обход больше не нужен.
export async function callAIWaterfallDirect(messages: ChatMessage[]): Promise<string> {
  return callAIWaterfall(messages);
}
