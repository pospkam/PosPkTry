/**
 * Shared AI provider functions — waterfall pattern.
 * MiMo-V2-Pro (Xiaomi) → OpenRouter (GPT-4o-mini) → xAI (Grok) → Anthropic (Haiku)
 *
 * Env vars:
 *   XIAOMI_API_KEY          — Xiaomi MiMo ($1/1M tokens, 1M context)
 *   OPENROUTER_API_KEY      — OpenRouter multi-model (GPT-4o-mini → DeepSeek → Claude Haiku)
 *   DEEPSEEK_API_KEY        — DeepSeek direct API
 *   GEMINI_API_KEY          — Google Gemini 2.0 Flash direct
 *   XAI_API_KEY             — xAI Grok-4 (geo-blocked RU)
 *   ANTHROPIC_API_KEY       — Claude Haiku direct (geo-blocked RU)
 *   MINIMAX_API_KEY         — Minimax (резерв)
 */

import type { ChatMessage } from '@/lib/ai/prompts';
import { getOpenRouterKey, getMiMoKey, getDeepSeekKey, getAnthropicKey, getXaiKey, getGeminiKey, getYandexKey, getMiniMaxKey } from '@/lib/ai/provider-config';

// ── Xiaomi MiMo-V2-Pro ────────────────────────────────────────
export async function callMiMo(messages: ChatMessage[]): Promise<string | null> {
  const apiKey = getMiMoKey();
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
        model: 'mimo-v2-pro',
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
  { id: 'openai/gpt-4o-mini',                timeout: 25_000 },
  { id: 'deepseek/deepseek-chat-v3-0324',    timeout: 25_000 },
  { id: 'google/gemini-2.0-flash-001',       timeout: 25_000 },
  { id: 'anthropic/claude-haiku-4-5',        timeout: 25_000 },
];

export async function callOpenrouter(messages: ChatMessage[]): Promise<string | null> {
  const apiKey = getOpenRouterKey();
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

      if (!res.ok) continue; // next model
      const data = await res.json();
      const text: string | undefined = data?.choices?.[0]?.message?.content;
      if (text?.trim()) return text;
      // No valid content — try next model
    } catch { continue; }
  }

  return null;
}

// ── OpenRouter: specific model ────────────────────────────────
// Calls a single specific model via OpenRouter. Used for per-agent model assignment.

export async function callOpenRouterModel(
  messages: ChatMessage[],
  modelId: string,
  timeoutMs = 30_000,
): Promise<{ text: string; model_used: string } | null> {
  const apiKey = getOpenRouterKey();
  if (!apiKey) return null;

  const payload = messages.map(({ role, content }) => ({ role, content }));

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
        model: modelId,
        temperature: 0.4,
        max_tokens: 800,
        messages: payload,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });

    if (!res.ok) return null;
    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const text = data?.choices?.[0]?.message?.content;
    if (!text?.trim()) return null;
    return { text: text.trim(), model_used: modelId };
  } catch {
    return null;
  }
}

// Call AI with a preferred model. Falls back to full waterfall if preferred model fails.
export async function callAIWithModel(
  messages: ChatMessage[],
  preferredModel?: string | null,
): Promise<{ text: string; model_used: string }> {
  if (preferredModel) {
    const result = await callOpenRouterModel(messages, preferredModel);
    if (result) return result;
  }
  const text = await callAIWaterfall(messages);
  return { text, model_used: 'waterfall-fallback' };
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
  const apiKey = getXaiKey();
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

// ── Anthropic Claude (direct API) ───────────────────────────
export async function callAnthropic(messages: ChatMessage[]): Promise<string | null> {
  const apiKey = getAnthropicKey();
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

// ── YandexGPT Lite (Yandex Cloud) ─────────────────────────────
// Лучший по русскому языку. Без геоблока для России.
// Env: YANDEX_API_KEY (Api-Key), YANDEX_FOLDER_ID (каталог YC)
export async function callYandexGPT(messages: ChatMessage[]): Promise<string | null> {
  const yandex = getYandexKey();
  if (!yandex) return null;
  const { apiKey, folderId } = yandex;

  try {
    // YandexGPT использует `text` вместо `content`
    const yMessages = messages
      .filter((m) => m.role !== 'system')
      .map(({ role, content }) => ({
        role: role === 'assistant' ? 'assistant' : 'user',
        text: content,
      }));

    const systemMsg = messages.find((m) => m.role === 'system');
    if (systemMsg) {
      yMessages.unshift({ role: 'system', text: systemMsg.content });
    }

    const res = await fetch(
      'https://llm.api.cloud.yandex.net/foundationModels/v1/completion',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Api-Key ${apiKey}`,
          'x-folder-id': folderId,
        },
        body: JSON.stringify({
          modelUri: `gpt://${folderId}/yandexgpt-5.1/latest`,
          completionOptions: {
            stream: false,
            temperature: 0.4,
            maxTokens: '800',
          },
          messages: yMessages,
        }),
        signal: AbortSignal.timeout(15_000),
      },
    );

    if (!res.ok) return null;
    const data = await res.json();
    const text: string | undefined =
      data?.result?.alternatives?.[0]?.message?.text;
    return text?.trim() || null;
  } catch {
    return null;
  }
}

// ── Google Gemini (via OpenRouter) ────────────────────────────
export async function callGemini(messages: ChatMessage[]): Promise<string | null> {
  const apiKey = getOpenRouterKey();
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

// ── DeepSeek (direct API) ──────────────────────────────────────
export async function callDeepSeek(messages: ChatMessage[]): Promise<string | null> {
  const apiKey = getDeepSeekKey();
  if (!apiKey) return null;

  try {
    const payload = messages.map(({ role, content }) => ({ role, content }));
    const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        temperature: 0.4,
        max_tokens: 800,
        messages: payload,
      }),
      signal: AbortSignal.timeout(20_000),
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text: string | undefined = data?.choices?.[0]?.message?.content;
    return text?.trim() || null;
  } catch { return null; }
}

// ── MiniMax 2.5 (direct API) ─────────────────────────────────
export async function callMiniMax(messages: ChatMessage[]): Promise<string | null> {
  const keys = getMiniMaxKey();
  if (!keys) return null;

  try {
    const payload = messages.map(({ role, content }) => ({ role, content }));
    const res = await fetch(
      `https://api.minimax.chat/v1/text/chatcompletion_v2?GroupId=${keys.groupId}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${keys.apiKey}`,
        },
        body: JSON.stringify({
          model: 'MiniMax-Text-01',
          temperature: 0.4,
          max_tokens: 800,
          messages: payload,
        }),
        signal: AbortSignal.timeout(20_000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const text: string | undefined = data?.choices?.[0]?.message?.content;
    return text?.trim() || null;
  } catch { return null; }
}

// ── Google Gemini (direct API) ─────────────────────────────────
export async function callGeminiDirect(messages: ChatMessage[]): Promise<string | null> {
  const apiKey = getGeminiKey();
  if (!apiKey) return null;

  try {
    const systemMsg = messages.find(m => m.role === 'system');
    const turns = messages.filter(m => m.role !== 'system');
    const contents = turns.map(({ role, content }) => ({
      role: role === 'assistant' ? 'model' : 'user',
      parts: [{ text: content }],
    }));

    const body: Record<string, unknown> = { contents };
    if (systemMsg) {
      body.systemInstruction = { parts: [{ text: systemMsg.content }] };
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(20_000),
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    const text: string | undefined = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    return text?.trim() || null;
  } catch { return null; }
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
  remaining: number | null; // null = pay-as-you-go (no limit)
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
  const apiKey  = getOpenRouterKey();

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
    // OR returns limit=999 as sentinel for "no hard limit" (pay-as-you-go)
    const effectiveLimit = limit != null && limit < 999 ? limit : null;
    const remaining = effectiveLimit != null ? Math.round((effectiveLimit - usage) * 100) / 100 : null;
    return {
      total_credits: effectiveLimit ?? 0,
      total_usage:   Math.round(usage * 100) / 100,
      remaining,     // null = pay-as-you-go, no hard limit
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
        body: JSON.stringify({ model: 'mimo-v2-pro', max_tokens: 5, messages: testMsg }),
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
    const apiKey = getOpenRouterKey();
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

  async function probeDeepSeek() {
    const apiKey = getDeepSeekKey();
    if (!apiKey) return { ok: false, error: 'DEEPSEEK_API_KEY not set' };
    try {
      const res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: 'deepseek-chat', max_tokens: 5, messages: testMsg }),
        signal: AbortSignal.timeout(5000),
      });
      if (!res.ok) {
        const body = await res.text().catch(() => '');
        return { ok: false, status: res.status, error: `HTTP ${res.status}: ${body.slice(0, 120)}` };
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
      probeDetailed('deepseek',   'DeepSeek-V3 (DeepSeek)',       probeDeepSeek),
    ]),
    checkOpenRouterBalance(),
  ]);

  return {
    providers,
    any_available: providers.some(p => p.available),
    openrouter_balance,
  };
}

// ── Race Helper: first non-empty result from parallel calls ──────
async function raceProviders(calls: Promise<string | null>[]): Promise<string | null> {
  return new Promise<string | null>((resolve) => {
    let pending = calls.length;
    if (pending === 0) { resolve(null); return; }
    let settled = false;
    calls.forEach(p =>
      p.then(result => {
        if (!settled && result?.trim()) { settled = true; resolve(result); }
      }).catch(() => {}).finally(() => {
        pending--;
        if (pending === 0 && !settled) resolve(null);
      })
    );
  });
}

// ── Waterfall: race tiers for speed ─────────────────────────
// Tier 1: fastest (DeepSeek + Gemini + MiMo) — race
// Tier 2: mid-tier (OpenRouter + Yandex + MiniMax) — race
// Tier 3: expensive/geo-blocked (Anthropic, xAI) — sequential fallback
export async function callAIWaterfall(messages: ChatMessage[]): Promise<string> {
  // Tier 1: race fastest providers
  const tier1 = await raceProviders([
    callDeepSeek(messages),
    callGeminiDirect(messages),
    callMiMo(messages),
  ]);
  if (tier1) return tier1;

  // Tier 2: race mid-tier
  const tier2 = await raceProviders([
    callOpenrouter(messages),
    callYandexGPT(messages),
    callMiniMax(messages),
  ]);
  if (tier2) return tier2;

  // Tier 3: sequential fallback (rarely reached)
  const anthropic = await callAnthropic(messages);
  if (anthropic) return anthropic;
  const xai = await callXai(messages);
  if (xai) return xai;

  return 'Извините, сервис временно недоступен. Попробуйте позже.';
}

// ── Fast Waterfall — race cheap providers ────────────────────
// Для структурированных задач (JSON, бинарные ответы, голосование).
// Races MiMo + DeepSeek-via-OR + Gemini simultaneously.
export async function callAIFast(messages: ChatMessage[]): Promise<string> {
  const apiKey = getOpenRouterKey();

  const calls: Promise<string | null>[] = [
    callMiMo(messages),
    callGeminiDirect(messages),
  ];

  // DeepSeek via OpenRouter (inline to avoid extra function)
  if (apiKey) {
    const payload = messages.map(({ role, content }) => ({ role, content }));
    calls.push(
      fetch('https://openrouter.ai/api/v1/chat/completions', {
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
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => (data?.choices?.[0]?.message?.content as string) ?? null)
        .catch(() => null)
    );
  }

  const result = await raceProviders(calls);
  return result ?? 'Сервис временно недоступен.';
}

// ── Waterfall Direct — алиас основного ────────────────────────
// Claude 4.6 на Timeweb корректно обрабатывает system prompt,
// поэтому отдельный обход больше не нужен.
export async function callAIWaterfallDirect(messages: ChatMessage[]): Promise<string> {
  return callAIWaterfall(messages);
}

/** Like callAIWithModel but returns plain string (for callsites that don't need model_used). */
export async function callAIWithModelDirect(
  messages: ChatMessage[],
  preferredModel?: string | null,
): Promise<string> {
  const { text } = await callAIWithModel(messages, preferredModel);
  return text;
}

// ── Debug Waterfall: диагностика каждого провайдера ──────────
export interface WaterfallDebugResult {
  provider: string;
  model: string;
  status: 'success' | 'no_key' | 'http_error' | 'empty_response' | 'error_in_body' | 'exception';
  http_status?: number;
  error?: string;
  answer_preview?: string;
  latency_ms: number;
}

export async function callAIWaterfallDebug(messages: ChatMessage[]): Promise<WaterfallDebugResult[]> {
  const results: WaterfallDebugResult[] = [];
  const payload = messages.map(({ role, content }) => ({ role, content }));

  // 1. MiMo
  {
    const start = Date.now();
    const apiKey = process.env.XIAOMI_API_KEY;
    if (!apiKey) {
      results.push({ provider: 'mimo', model: 'MiMo-V2-Pro', status: 'no_key', latency_ms: 0 });
    } else {
      try {
        const res = await fetch('https://api.xiaomimimo.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model: 'mimo-v2-pro', temperature: 0.4, max_tokens: 200, messages: payload }),
          signal: AbortSignal.timeout(15_000),
        });
        const ms = Date.now() - start;
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          results.push({ provider: 'mimo', model: 'MiMo-V2-Pro', status: 'http_error', http_status: res.status, error: errText.slice(0, 200), latency_ms: ms });
        } else {
          const data = await res.json();
          const text = data?.choices?.[0]?.message?.content;
          results.push({ provider: 'mimo', model: 'MiMo-V2-Pro', status: text ? 'success' : 'empty_response', answer_preview: text?.slice(0, 100), latency_ms: ms });
        }
      } catch (e) {
        results.push({ provider: 'mimo', model: 'MiMo-V2-Pro', status: 'exception', error: String(e).slice(0, 200), latency_ms: Date.now() - start });
      }
    }
  }

  // 2. OpenRouter (each model)
  {
    const apiKey = getOpenRouterKey();
    if (!apiKey) {
      results.push({ provider: 'openrouter', model: 'all', status: 'no_key', latency_ms: 0 });
    } else {
      for (const { id, timeout } of OR_MODELS) {
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
            body: JSON.stringify({ model: id, temperature: 0.4, max_tokens: 200, messages: payload }),
            signal: AbortSignal.timeout(timeout),
          });
          const ms = Date.now() - start;
          if (!res.ok) {
            const errText = await res.text().catch(() => '');
            results.push({ provider: 'openrouter', model: id, status: 'http_error', http_status: res.status, error: errText.slice(0, 200), latency_ms: ms });
          } else {
            const data = await res.json();
            if (data?.error) {
              results.push({ provider: 'openrouter', model: id, status: 'error_in_body', error: JSON.stringify(data.error).slice(0, 200), latency_ms: ms });
            } else {
              const text = data?.choices?.[0]?.message?.content;
              results.push({ provider: 'openrouter', model: id, status: text ? 'success' : 'empty_response', answer_preview: text?.slice(0, 100), latency_ms: ms });
            }
          }
        } catch (e) {
          results.push({ provider: 'openrouter', model: id, status: 'exception', error: String(e).slice(0, 200), latency_ms: Date.now() - start });
        }
      }
    }
  }

  // 3. YandexGPT
  {
    const start = Date.now();
    const apiKey = process.env.YANDEX_API_KEY;
    const folderId = process.env.YANDEX_FOLDER_ID;
    if (!apiKey || !folderId) {
      results.push({ provider: 'yandex', model: 'yandexgpt-5.1', status: 'no_key', latency_ms: 0 });
    } else {
      try {
        const yMessages = messages.filter(m => m.role !== 'system').map(({ role, content }) => ({
          role: role === 'assistant' ? 'assistant' : 'user', text: content,
        }));
        const systemMsg = messages.find(m => m.role === 'system');
        if (systemMsg) yMessages.unshift({ role: 'system', text: systemMsg.content });

        const res = await fetch('https://llm.api.cloud.yandex.net/foundationModels/v1/completion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Api-Key ${apiKey}`, 'x-folder-id': folderId },
          body: JSON.stringify({ modelUri: `gpt://${folderId}/yandexgpt-5.1/latest`, completionOptions: { stream: false, temperature: 0.4, maxTokens: '200' }, messages: yMessages }),
          signal: AbortSignal.timeout(15_000),
        });
        const ms = Date.now() - start;
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          results.push({ provider: 'yandex', model: 'yandexgpt-5.1', status: 'http_error', http_status: res.status, error: errText.slice(0, 200), latency_ms: ms });
        } else {
          const data = await res.json();
          const text = data?.result?.alternatives?.[0]?.message?.text;
          results.push({ provider: 'yandex', model: 'yandexgpt-5.1', status: text ? 'success' : 'empty_response', answer_preview: text?.slice(0, 100), latency_ms: ms });
        }
      } catch (e) {
        results.push({ provider: 'yandex', model: 'yandexgpt-5.1', status: 'exception', error: String(e).slice(0, 200), latency_ms: Date.now() - start });
      }
    }
  }

  // 4. DeepSeek direct
  {
    const start = Date.now();
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      results.push({ provider: 'deepseek', model: 'deepseek-chat', status: 'no_key', latency_ms: 0 });
    } else {
      try {
        const res = await fetch('https://api.deepseek.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model: 'deepseek-chat', temperature: 0.4, max_tokens: 200, messages: payload }),
          signal: AbortSignal.timeout(15_000),
        });
        const ms = Date.now() - start;
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          results.push({ provider: 'deepseek', model: 'deepseek-chat', status: 'http_error', http_status: res.status, error: errText.slice(0, 200), latency_ms: ms });
        } else {
          const data = await res.json();
          const text = data?.choices?.[0]?.message?.content;
          results.push({ provider: 'deepseek', model: 'deepseek-chat', status: text ? 'success' : 'empty_response', answer_preview: text?.slice(0, 100), latency_ms: ms });
        }
      } catch (e) {
        results.push({ provider: 'deepseek', model: 'deepseek-chat', status: 'exception', error: String(e).slice(0, 200), latency_ms: Date.now() - start });
      }
    }
  }

  // 5. Gemini direct
  {
    const start = Date.now();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      results.push({ provider: 'gemini', model: 'gemini-2.0-flash', status: 'no_key', latency_ms: 0 });
    } else {
      try {
        const systemMsg = messages.find(m => m.role === 'system');
        const turns = messages.filter(m => m.role !== 'system');
        const contents = turns.map(({ role, content }) => ({ role: role === 'assistant' ? 'model' : 'user', parts: [{ text: content }] }));
        const reqBody: Record<string, unknown> = { contents };
        if (systemMsg) reqBody.systemInstruction = { parts: [{ text: systemMsg.content }] };

        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reqBody), signal: AbortSignal.timeout(15_000),
        });
        const ms = Date.now() - start;
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          results.push({ provider: 'gemini', model: 'gemini-2.0-flash', status: 'http_error', http_status: res.status, error: errText.slice(0, 200), latency_ms: ms });
        } else {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          results.push({ provider: 'gemini', model: 'gemini-2.0-flash', status: text ? 'success' : 'empty_response', answer_preview: text?.slice(0, 100), latency_ms: ms });
        }
      } catch (e) {
        results.push({ provider: 'gemini', model: 'gemini-2.0-flash', status: 'exception', error: String(e).slice(0, 200), latency_ms: Date.now() - start });
      }
    }
  }

  // 6. xAI
  {
    const start = Date.now();
    const apiKey = process.env.XAI_API_KEY;
    if (!apiKey) {
      results.push({ provider: 'xai', model: 'grok-4', status: 'no_key', latency_ms: 0 });
    } else {
      try {
        const res = await fetch('https://api.x.ai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({ model: 'grok-4', temperature: 0.4, max_tokens: 200, messages: payload }),
          signal: AbortSignal.timeout(15_000),
        });
        const ms = Date.now() - start;
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          results.push({ provider: 'xai', model: 'grok-4', status: 'http_error', http_status: res.status, error: errText.slice(0, 200), latency_ms: ms });
        } else {
          const data = await res.json();
          const text = data?.choices?.[0]?.message?.content;
          results.push({ provider: 'xai', model: 'grok-4', status: text ? 'success' : 'empty_response', answer_preview: text?.slice(0, 100), latency_ms: ms });
        }
      } catch (e) {
        results.push({ provider: 'xai', model: 'grok-4', status: 'exception', error: String(e).slice(0, 200), latency_ms: Date.now() - start });
      }
    }
  }

  // 7. Anthropic direct
  {
    const start = Date.now();
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      results.push({ provider: 'anthropic', model: 'claude-haiku-4.5', status: 'no_key', latency_ms: 0 });
    } else {
      try {
        const systemMsg = messages.find(m => m.role === 'system');
        const turns = messages.filter(m => m.role !== 'system');
        const firstUserIdx = turns.findIndex(m => m.role === 'user');
        const clean = firstUserIdx >= 0 ? turns.slice(firstUserIdx) : turns;
        const anthropicMessages = clean.slice(-6).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content }));

        const res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
          body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 200, temperature: 0.4, ...(systemMsg ? { system: systemMsg.content } : {}), messages: anthropicMessages }),
          signal: AbortSignal.timeout(15_000),
        });
        const ms = Date.now() - start;
        if (!res.ok) {
          const errText = await res.text().catch(() => '');
          results.push({ provider: 'anthropic', model: 'claude-haiku-4.5', status: 'http_error', http_status: res.status, error: errText.slice(0, 200), latency_ms: ms });
        } else {
          const data = await res.json() as Record<string, unknown>;
          const content = Array.isArray(data.content) ? data.content as Array<Record<string, unknown>> : [];
          const text = typeof content[0]?.text === 'string' ? content[0].text as string : undefined;
          results.push({ provider: 'anthropic', model: 'claude-haiku-4.5', status: text ? 'success' : 'empty_response', answer_preview: text?.slice(0, 100), latency_ms: ms });
        }
      } catch (e) {
        results.push({ provider: 'anthropic', model: 'claude-haiku-4.5', status: 'exception', error: String(e).slice(0, 200), latency_ms: Date.now() - start });
      }
    }
  }

  return results;
}
