/**
 * POST /api/ai/chat
 * AI чат с поддержкой ролей, памяти (10 сообщений) и anti-hallucination
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSystemPrompt, buildMessageHistory, ChatRole, ChatMessage } from '@/lib/ai/prompts';
import { query } from '@/lib/database';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { callAIWaterfall } from '@/lib/ai/providers';

export const dynamic = 'force-dynamic';

// 20 requests per minute per IP — enough for interactive UI, prevents API cost abuse
const chatRateLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });

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
const AiChatSchema = z.object({
  message: z.string().min(1, 'Сообщение обязательно'),
  sessionId: z.string().optional(),
  role: z.string().default('tourist'),
  userId: z.string().nullable().default(null),
});

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  if (!chatRateLimiter.check(ip)) {
    return NextResponse.json(
      { success: false, error: 'Слишком много запросов. Попробуйте через минуту.' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = AiChatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      );
    }
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

    // Waterfall: Timeweb → OpenRouter → DeepSeek → Minimax → xAI → Anthropic
    const answer = await callAIWaterfall(messagesForAI);

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
