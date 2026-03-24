/**
 * POST /api/ai/chat
 * AI chat with role support, memory (10 messages), anti-hallucination.
 * 5 free messages for anonymous users, unlimited for authenticated.
 * Encrypted interest collection from user messages.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSystemPrompt, buildMessageHistory, ChatRole, ChatMessage } from '@/lib/ai/prompts';
import { query } from '@/lib/database';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { callAIWaterfall } from '@/lib/ai/providers';
import { getUserFromRequest } from '@/lib/auth/jwt';
import { extractAndEncryptInterests } from '@/lib/ai/interest-extractor';
import { PlatformAgent } from '@/lib/agents/platform-agent';
import {
  loadUserMemory,
  upsertUserMemory,
  extractMemoryFromMessage,
  buildMemoryContext,
} from '@/lib/ai/user-memory';
import { detectTourIntent, findRelevantTours, type TourSuggestion } from '@/lib/ai/booking-intent';
import { buildRAGContext } from '@/lib/ai/rag-context';

export const dynamic = 'force-dynamic';

const FREE_MESSAGE_LIMIT = 5;

const chatRateLimiter = createRateLimiter({ windowMs: 60_000, max: 20 });

// ── Session loading with new columns ─────────────────────────────
interface SessionRow {
  messages: ChatMessage[];
  user_message_count: number;
  interests_encrypted: string | null;
  is_authenticated: boolean;
}

async function loadSession(sessionId: string): Promise<SessionRow | null> {
  if (!sessionId) return null;
  try {
    const result = await query<SessionRow>(
      `SELECT messages, user_message_count, interests_encrypted, is_authenticated
       FROM chat_sessions WHERE session_id = $1 LIMIT 1`,
      [sessionId]
    );
    return result.rows[0] ?? null;
  } catch {
    return null;
  }
}

// ── Save session with all fields ──────────────────────────────────
async function saveSession(
  sessionId: string,
  userId: string | null,
  role: ChatRole,
  messages: ChatMessage[],
  userMessageCount: number,
  isAuthenticated: boolean,
  interestsEncrypted: string | null
): Promise<void> {
  if (!sessionId) return;
  const trimmed = messages.slice(-20);
  try {
    await query(
      `INSERT INTO chat_sessions (session_id, user_id, role, messages, user_message_count, is_authenticated, interests_encrypted, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, NOW())
       ON CONFLICT (session_id) DO UPDATE
         SET messages = $4::jsonb,
             user_message_count = $5,
             is_authenticated = $6,
             interests_encrypted = COALESCE($7, chat_sessions.interests_encrypted),
             updated_at = NOW(),
             role = $3`,
      [sessionId, userId, role, JSON.stringify(trimmed), userMessageCount, isAuthenticated, interestsEncrypted]
    );
  } catch {
    // Non-critical
  }
}

// ── POST handler ──────────────────────────────────────────────────
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

    const { message, sessionId, role = 'tourist' } = parsed.data;

    if (!message?.trim()) {
      return NextResponse.json({ success: false, error: 'Сообщение не может быть пустым' }, { status: 400 });
    }

    // Soft auth check (returns null for anonymous)
    const user = await getUserFromRequest(request);
    const isAuthenticated = !!user;

    const validRoles: ChatRole[] = ['tourist', 'operator', 'guide', 'admin', 'agent', 'transfer'];
    const safeRole: ChatRole = validRoles.includes(role as ChatRole) ? (role as ChatRole) : 'tourist';

    // Load session
    const session = sessionId ? await loadSession(sessionId) : null;
    const currentCount = session?.user_message_count ?? 0;
    const history: ChatMessage[] = session?.messages ?? [];
    const isNewSession = !session; // первое сообщение = новая сессия

    // Check limit for anonymous users
    if (!isAuthenticated && currentCount >= FREE_MESSAGE_LIMIT) {
      return NextResponse.json({
        success: true,
        data: {
          limitReached: true,
          message: 'Вы использовали все бесплатные сообщения. Зарегистрируйтесь, чтобы продолжить общение с AI-помощником.',
          registerUrl: '/auth/login',
          userMessageCount: currentCount,
          remainingFree: 0,
        },
      });
    }

    // Долгосрочная память (только для авторизованных)
    const userId = user?.userId ? parseInt(user.userId, 10) : null;
    const userMemory = userId ? await loadUserMemory(userId) : null;

    // Build AI prompt
    const userMsg: ChatMessage = { role: 'user', content: message.trim(), timestamp: Date.now() };
    history.push(userMsg);

    const basePrompt   = getSystemPrompt(safeRole);
    const memContext   = userMemory ? buildMemoryContext(userMemory) : '';
    const ragContext   = await buildRAGContext(message.trim(), safeRole);
    const systemPrompt = basePrompt + ragContext + memContext;
    const messagesForAI = buildMessageHistory(systemPrompt, history, 10);

    // PlatformAgent intercept: admin/operator с распознанным интентом
    let answer: string | null = null;
    if (isAuthenticated && user && (safeRole === 'admin' || safeRole === 'operator')) {
      try {
        const agentResult = await PlatformAgent.dispatch({
          message: message.trim(),
          userId: user.userId ? parseInt(user.userId, 10) : undefined,
          role: safeRole,
        });
        if (agentResult.intent !== 'unknown') answer = agentResult.response;
      } catch { /* fall through to raw AI */ }
    }
    answer ??= await callAIWaterfall(messagesForAI);

    // Tour suggestions — only for tourist role (fire-and-forget fetch, non-blocking)
    let tourSuggestions: TourSuggestion[] = [];
    if (safeRole === 'tourist') {
      const intentResult = detectTourIntent(message.trim());
      if (intentResult.detected) {
        tourSuggestions = await findRelevantTours(intentResult.activityType, intentResult.rawWords);
      }
    }

    const assistantMsg: ChatMessage = { role: 'assistant', content: answer, timestamp: Date.now() };
    history.push(assistantMsg);

    // Increment count and extract interests
    const newCount = currentCount + 1;
    const interestsEncrypted = extractAndEncryptInterests(message, session?.interests_encrypted ?? null);

    // Обновить долгосрочную память пользователя (fire-and-forget, не блокирует ответ)
    if (userId) {
      const extracted = extractMemoryFromMessage(message.trim());
      void upsertUserMemory(userId, extracted, true, isNewSession);
    }

    // Save
    if (sessionId) {
      await saveSession(sessionId, user?.userId ?? null, safeRole, history, newCount, isAuthenticated, interestsEncrypted);
    }

    const remaining = isAuthenticated ? null : Math.max(0, FREE_MESSAGE_LIMIT - newCount);

    return NextResponse.json({
      success: true,
      data: {
        answer,
        sessionId: sessionId ?? null,
        role: safeRole,
        messagesInHistory: history.length,
        remainingFree: remaining,
        isAuthenticated,
        ...(tourSuggestions.length > 0 ? { tours: tourSuggestions } : {}),
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown';
    return NextResponse.json(
      { success: false, error: 'Внутренняя ошибка сервера', details: msg },
      { status: 500 }
    );
  }
}

// ── GET: get session history + limit status ──────────────────────
export async function GET(request: NextRequest) {
  try {
    const sessionId = request.nextUrl.searchParams.get('sessionId');
    if (!sessionId) {
      return NextResponse.json({ success: false, error: 'sessionId обязателен' }, { status: 400 });
    }

    const user = await getUserFromRequest(request);
    const isAuthenticated = !!user;

    const session = await loadSession(sessionId);
    const history = session?.messages ?? [];
    const publicHistory = history.filter((m) => m.role !== 'system');
    const count = session?.user_message_count ?? 0;
    const limitReached = !isAuthenticated && count >= FREE_MESSAGE_LIMIT;

    return NextResponse.json({
      success: true,
      data: {
        messages: publicHistory,
        userMessageCount: count,
        limitReached,
        isAuthenticated,
        remainingFree: isAuthenticated ? null : Math.max(0, FREE_MESSAGE_LIMIT - count),
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown';
    return NextResponse.json({ success: false, error: 'Ошибка загрузки истории', details: msg }, { status: 500 });
  }
}
