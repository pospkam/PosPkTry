/**
 * POST /api/ai/chat
 * AI чат с поддержкой ролей, памяти (10 сообщений) и anti-hallucination
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSystemPrompt, buildMessageHistory, ChatRole, ChatMessage } from '@/lib/ai/prompts';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

// ── Anthropic Claude (primary) ─────────────────────────────────
async function callAnthropic(messages: ChatMessage[]): Promise<string | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error('[AI] ANTHROPIC_API_KEY не установлен');
    return null;
  }

  try {
    // Extract system message — buildMessageHistory puts it first with role:'system'
    const systemMsg = messages.find(m => m.role === 'system');
    const turns = messages.filter(m => m.role !== 'system');

    // Anthropic requires messages to start with 'user' and alternate user/assistant.
    // slice(-6) may begin with an assistant message after several exchanges — fix that.
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

// ── DeepSeek fallback ──────────────────────────────────────────
async function callDeepSeek(messages: ChatMessage[]): Promise<string | null> {
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

// ── Minimax (primary) ─────────────────────────────────────────
async function callMinimax(messages: ChatMessage[]): Promise<string | null> {
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

// ── xAI (Grok) fallback ──────────────────────────────────────
async function callXai(messages: ChatMessage[]): Promise<string | null> {
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

// ── OpenRouter fallback ─────────────────────────────────────
async function callOpenrouter(messages: ChatMessage[]): Promise<string | null> {
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

// ── Загрузка истории сессии из БД ─────────────────────────────
async function loadSessionHistory(sessionId: string): Promise<ChatMessage[]> {
  if (!sessionId) return [];

  try {
    const result = await query<{ messages: ChatMessage[] }>(
      `SELECT messages FROM chat_sessions WHERE session_id = $1 ORDER BY updated_at DESC LIMIT 1`,
      [sessionId]
    );
    if (result.rows.length > 0) {
      return result.rows[0].messages ?? [];
    }
  } catch {
    // Таблица может не существовать — возвращаем пустую историю
  }
  return [];
}

// ── Сохранение истории сессии в БД ────────────────────────────
async function saveSessionHistory(
  sessionId: string,
  userId: string | null,
  role: ChatRole,
  messages: ChatMessage[]
): Promise<void> {
  if (!sessionId) return;

  // Оставляем только последние 20 сообщений
  const trimmed = messages.slice(-20);

  try {
    await query(
      `INSERT INTO chat_sessions (session_id, user_id, role, messages, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, NOW())
       ON CONFLICT (session_id) DO UPDATE
         SET messages = $4::jsonb, updated_at = NOW(), role = $3`,
      [sessionId, userId, role, JSON.stringify(trimmed)]
    );
  } catch {
    // Не критично — продолжаем без сохранения
  }
}

// ── Основной обработчик ────────────────────────────────────────
// AUTH: Public — AI chat assistant for visitors
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      message,
      sessionId,
      role = 'tourist',
      userId = null,
    }: {
      message: string;
      sessionId?: string;
      role?: ChatRole;
      userId?: string | null;
    } = body;

    if (!message?.trim()) {
      return NextResponse.json({ success: false, error: 'Сообщение не может быть пустым' }, { status: 400 });
    }

    const validRoles: ChatRole[] = ['tourist', 'operator', 'guide', 'admin', 'agent', 'transfer'];
    const safeRole: ChatRole = validRoles.includes(role) ? role : 'tourist';

    // Загружаем историю из БД
    const history = sessionId ? await loadSessionHistory(sessionId) : [];

    // Добавляем новое сообщение пользователя
    const userMessage: ChatMessage = {
      role: 'user',
      content: message.trim(),
      timestamp: Date.now(),
    };
    history.push(userMessage);

    // Строим промпт с системным контекстом и последними 10 сообщениями
    const systemPrompt = getSystemPrompt(safeRole);
    const messagesForAI = buildMessageHistory(systemPrompt, history, 10);

    // Вызываем AI — xAI → Anthropic → Minimax → DeepSeek → OpenRouter → fallback
    let answer = await callXai(messagesForAI);
    if (!answer) answer = await callAnthropic(messagesForAI);
    if (!answer) answer = await callMinimax(messagesForAI);
    if (!answer) answer = await callDeepSeek(messagesForAI);
    if (!answer) answer = await callOpenrouter(messagesForAI);
    if (!answer) {
      answer = 'Извините, сервис временно недоступен. Попробуйте позже или обратитесь в поддержку.';
    }

    // Добавляем ответ ассистента в историю
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: answer,
      timestamp: Date.now(),
    };
    history.push(assistantMessage);

    // Сохраняем обновлённую историю
    if (sessionId) {
      await saveSessionHistory(sessionId, userId, safeRole, history);
    }

    return NextResponse.json({
      success: true,
      data: {
        answer,
        sessionId: sessionId ?? null,
        role: safeRole,
        messagesInHistory: history.length,
      },
    });
  } catch (error) {
    console.error('AI chat error:', error);
    return NextResponse.json(
      { success: false, error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}

// ── GET: получить историю сессии ──────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'sessionId обязателен' }, { status: 400 });
    }

    const history = await loadSessionHistory(sessionId);
    const publicHistory = history.filter((m) => m.role !== 'system');

    return NextResponse.json({ success: true, data: { messages: publicHistory } });
  } catch (error) {
    console.error('Get chat history error:', error);
    return NextResponse.json({ success: false, error: 'Ошибка загрузки истории' }, { status: 500 });
  }
}
