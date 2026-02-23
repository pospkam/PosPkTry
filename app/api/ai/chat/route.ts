/**
 * POST /api/ai/chat
 * AI чат с поддержкой ролей, памяти (10 сообщений) и anti-hallucination
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSystemPrompt, buildMessageHistory, ChatRole, ChatMessage } from '@/lib/ai/prompts';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

// ── Groq AI вызов ──────────────────────────────────────────────
async function callGroq(messages: ChatMessage[]): Promise<string | null> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-70b-versatile',
        temperature: 0.4,
        max_tokens: 800,
        messages,
      }),
    });

    if (!res.ok) {
      console.error(`Groq API error: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch (err) {
    console.error('Groq call failed:', err);
    return null;
  }
}

// ── DeepSeek fallback ──────────────────────────────────────────
async function callDeepSeek(messages: ChatMessage[]): Promise<string | null> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) return null;

  try {
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
        messages,
      }),
    });

    if (!res.ok) return null;
    const data = await res.json();
    return data?.choices?.[0]?.message?.content ?? null;
  } catch {
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

    // Вызываем AI — Groq → DeepSeek → fallback
    let answer = await callGroq(messagesForAI);
    if (!answer) answer = await callDeepSeek(messagesForAI);
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
