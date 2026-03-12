/**
 * Shared AI provider functions — waterfall pattern.
 * Timeweb Agent → OpenRouter → DeepSeek → Minimax → xAI → Anthropic
 */

import type { ChatMessage } from '@/lib/ai/prompts';

// ── Timeweb Cloud AI Agent (primary) ───────────────────────────
export async function callTimewebAgent(messages: ChatMessage[]): Promise<string | null> {
  const token = process.env.TIMEWEB_TOKEN;
  const agentId = process.env.TIMEWEB_AI_AGENT_ID;
  if (!token || !agentId) return null;

  try {
    const payload = messages.map(({ role, content }) => ({ role, content }));
    const res = await fetch(
      `https://agent.timeweb.cloud/api/v1/cloud-ai/agents/${agentId}/v1/chat/completions`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          temperature: 0.4,
          max_tokens: 800,
          messages: payload,
        }),
        signal: AbortSignal.timeout(25_000),
      }
    );

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[AI] Timeweb agent ${res.status}:`, errText.slice(0, 300));
      return null;
    }

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    return data?.choices?.[0]?.message?.content ?? null;
  } catch (e) {
    console.error('[AI] Timeweb agent exception:', e instanceof Error ? e.message : String(e));
    return null;
  }
}

// ── OpenRouter ─────────────────────────────────────────────────
export async function callOpenrouter(messages: ChatMessage[]): Promise<string | null> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) return null;

  try {
    const payload = messages.map(({ role, content }) => ({ role, content }));
    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        temperature: 0.4,
        max_tokens: 800,
        messages: payload,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[AI] OpenRouter ${res.status}:`, errText.slice(0, 200));
      return null;
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch (e) {
    console.error('[AI] OpenRouter exception:', e instanceof Error ? e.message : String(e));
    return null;
  }
}

// ── DeepSeek ───────────────────────────────────────────────────
export async function callDeepSeek(messages: ChatMessage[]): Promise<string | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
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
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[AI] DeepSeek ${res.status}:`, errText.slice(0, 200));
      return null;
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch (e) {
    console.error('[AI] DeepSeek exception:', e instanceof Error ? e.message : String(e));
    return null;
  }
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
      console.error(`[AI] Minimax ${res.status}:`, errText.slice(0, 200));
      return null;
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch (e) {
    console.error('[AI] Minimax exception:', e instanceof Error ? e.message : String(e));
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
      console.error(`[AI] xAI ${res.status}:`, errText.slice(0, 200));
      return null;
    }
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch (e) {
    console.error('[AI] xAI exception:', e instanceof Error ? e.message : String(e));
    return null;
  }
}

// ── Anthropic Claude ──────────────────────────────────────────
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
        model: 'claude-opus-4-6',
        max_tokens: 800,
        temperature: 0.4,
        ...(systemMsg ? { system: systemMsg.content } : {}),
        messages: anthropicMessages,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.error(`[AI] Anthropic ${res.status}:`, errText.slice(0, 300));
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
    console.error('[AI] Anthropic exception:', e instanceof Error ? e.message : String(e));
    return null;
  }
}

// ── Waterfall: пробует провайдеров по очереди ─────────────────
export async function callAIWaterfall(messages: ChatMessage[]): Promise<string> {
  let answer = await callTimewebAgent(messages);
  if (!answer) answer = await callOpenrouter(messages);
  if (!answer) answer = await callDeepSeek(messages);
  if (!answer) answer = await callMinimax(messages);
  if (!answer) answer = await callXai(messages);
  if (!answer) answer = await callAnthropic(messages);
  return answer ?? 'Извините, сервис временно недоступен. Попробуйте позже.';
}
