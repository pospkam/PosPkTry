/**
 * POST /api/ai/chat-stream
 * 
 * Server-Sent Events (SSE) streaming for AI responses.
 * Streams tokens as they arrive from OpenRouter API.
 * 
 * Usage:
 *   const response = await fetch('/api/ai/chat-stream', {
 *     method: 'POST',
 *     body: JSON.stringify({ message: '...', sessionId: '...', role: 'tourist' })
 *   });
 *   const reader = response.body.getReader();
 *   while (true) {
 *     const { done, value } = await reader.read();
 *     if (done) break;
 *     const chunk = new TextDecoder().decode(value);
 *     events.push(chunk); // data: token format
 *   }
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { safeMsg } from '@/lib/errors/sanitize';
import { query } from '@/lib/database';
import { getSystemPrompt, buildMessageHistory, type ChatMessage, type ChatRole } from '@/lib/ai/prompts';
import { buildRAGContext, buildGeoContext } from '@/lib/ai/rag-context';
import { getOpenRouterKey } from '@/lib/ai/provider-config';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { getUserFromRequest } from '@/lib/auth/jwt';
import { getModelForAgent } from '@/lib/ai/agent-models';
import { callAIWithModelDirect } from '@/lib/ai/providers';
import { extractAndEncryptInterests } from '@/lib/ai/interest-extractor';
import {
  loadUserMemory,
  loadTripHistory,
  extractMemoryFromMessage,
  buildMemoryContext,
  buildAgentInsightsForTourist,
  upsertUserMemory,
  synthesizeUserNotes,
} from '@/lib/ai/user-memory';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const FREE_MESSAGE_LIMIT = 3;

const streamLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const Schema = z.object({
  message: z.string().min(1).max(1000),
  sessionId: z.string().optional(),
  role: z.string().default('tourist'),
  history: z.array(ChatMessageSchema).max(20).optional(),
  // Geo: user coordinates (from browser geolocation)
  userLocation: z.object({
    lat: z.number(),
    lng: z.number(),
    accuracy: z.number().optional(),
    timestamp: z.number().optional(),
  }).optional(),
});

interface SessionRow {
  messages: ChatMessage[];
  user_message_count: number;
  interests_encrypted: string | null;
}

async function loadSession(sessionId: string): Promise<SessionRow | null> {
  if (!sessionId) return null;
  try {
    const result = await query<SessionRow>(
      `SELECT messages, user_message_count, interests_encrypted
       FROM chat_sessions WHERE session_id = $1 LIMIT 1`,
      [sessionId],
    );
    return result.rows[0] ?? null;
  } catch {
    return null;
  }
}

async function saveSession(
  sessionId: string,
  userId: string | null,
  role: ChatRole,
  messages: ChatMessage[],
  userMessageCount: number,
  isAuthenticated: boolean,
  interestsEncrypted: string | null,
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
      [sessionId, userId, role, JSON.stringify(trimmed), userMessageCount, isAuthenticated, interestsEncrypted],
    );
  } catch {
    // Non-critical
  }
}

async function streamViaOpenRouter(messages: ChatMessage[]): Promise<Response | null> {
  const apiKey = getOpenRouterKey();
  if (!apiKey) return null;

  const payload = messages.map((m) => ({ role: m.role, content: m.content }));

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://tourhab.ru',
        'X-Title': 'TourHab Chat Stream',
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: payload,
        temperature: 0.5,
        max_tokens: 800,
        stream: true,
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok || !response.body) return null;
    return response;
  } catch {
    return null;
  }
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  if (!streamLimiter.check(ip)) {
    return NextResponse.json(
      { error: 'Слишком много запросов' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });
    }

    const { message, sessionId, role = 'tourist', history: clientHistory, userLocation } = parsed.data;
    const validRoles: ChatRole[] = ['tourist', 'operator', 'guide', 'admin', 'agent', 'transfer'];
    const safeRole: ChatRole = validRoles.includes(role as ChatRole) ? (role as ChatRole) : 'tourist';
    const user = await getUserFromRequest(request);
    const isAuthenticated = !!user;

    const session = sessionId ? await loadSession(sessionId) : null;
    const history: ChatMessage[] = (session?.messages?.length ? session.messages : null)
      ?? (clientHistory as ChatMessage[] | undefined)
      ?? [];
    const currentCount = session?.user_message_count ?? 0;
    const isNewSession = !session;

    if (!isAuthenticated && currentCount >= FREE_MESSAGE_LIMIT) {
      return NextResponse.json(
        {
          success: true,
          data: {
            limitReached: true,
            authRequired: true,
            message: 'Зарегистрируйтесь, чтобы продолжить общение с AI-помощником Кузьмичом. Это бесплатно!',
            registerUrl: '/auth/login',
            userMessageCount: currentCount,
            remainingFree: 0,
          },
        },
        { status: 200 },
      );
    }

    const userId = user?.userId ?? null; // UUID строка, не parseInt
    const [userMemory, tripHistory] = await Promise.all([
      userId ? loadUserMemory(userId) : Promise.resolve(null),
      userId ? loadTripHistory(userId) : Promise.resolve([]),
    ]);

    const userMsg: ChatMessage = { role: 'user', content: message.trim(), timestamp: Date.now() };
    history.push(userMsg);

    const basePrompt = getSystemPrompt(safeRole);
    const memContext = userMemory ? buildMemoryContext(userMemory, tripHistory) : '';

    // Geo-context: inject user location into system prompt + RAG boost
    // Normalize userLocation to full UserLocation type
    const geo = userLocation
      ? { lat: userLocation.lat, lng: userLocation.lng, accuracy: userLocation.accuracy ?? 0, timestamp: userLocation.timestamp ?? Date.now() }
      : undefined;

    const geoContext = geo ? await buildGeoContext(geo).catch(() => '') : '';

    const [ragContext, agentInsights] = await Promise.all([
      buildRAGContext(message.trim(), safeRole, geo),
      safeRole === 'tourist' ? buildAgentInsightsForTourist() : Promise.resolve(''),
    ]);
    const systemPrompt = basePrompt + geoContext + ragContext + memContext + agentInsights;
    const messagesForAI = buildMessageHistory(systemPrompt, history, 10);

    const orStreamResponse = await streamViaOpenRouter(messagesForAI);

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start' })}\n\n`));

        let fullAnswer = '';
        const persistState = async () => {
          const assistantMsg: ChatMessage = { role: 'assistant', content: fullAnswer, timestamp: Date.now() };
          history.push(assistantMsg);
          const newCount = currentCount + 1;
          const interestsEncrypted = extractAndEncryptInterests(message, session?.interests_encrypted ?? null);

          if (sessionId) {
            await saveSession(
              sessionId,
              user?.userId ?? null,
              safeRole,
              history,
              newCount,
              isAuthenticated,
              interestsEncrypted,
            );
          }

          const extracted = extractMemoryFromMessage(message.trim());
          if (userId) {
            void upsertUserMemory(userId, extracted, true, isNewSession);
            if (safeRole === 'tourist' && newCount % 5 === 0) {
              void synthesizeUserNotes(userId, history, userMemory?.ai_notes ?? null);
            }
          }
        };

        try {
          if (orStreamResponse?.body) {
            const reader = orStreamResponse.body.getReader();
            const decoder = new TextDecoder();
            let buffer = '';

            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              buffer += decoder.decode(value, { stream: true });
              const events = buffer.split('\n\n');
              buffer = events.pop() ?? '';

              for (const evt of events) {
                const line = evt
                  .split('\n')
                  .find((l) => l.startsWith('data: '));
                if (!line) continue;
                const payload = line.slice(6).trim();
                if (!payload || payload === '[DONE]') continue;

                try {
                  const parsedChunk = JSON.parse(payload) as {
                    choices?: Array<{ delta?: { content?: string } }>;
                  };
                  const token = parsedChunk.choices?.[0]?.delta?.content ?? '';
                  if (!token) continue;

                  fullAnswer += token;
                  controller.enqueue(encoder.encode(
                    `data: ${JSON.stringify({ type: 'token', content: token })}\n\n`,
                  ));
                } catch {
                  // Skip malformed chunk and continue streaming
                }
              }
            }
          } else {
            fullAnswer = await callAIWithModelDirect(messagesForAI, getModelForAgent('kuzmich'));
            for (const word of fullAnswer.split(/(\s+)/)) {
              if (!word) continue;
              controller.enqueue(encoder.encode(
                `data: ${JSON.stringify({ type: 'token', content: word })}\n\n`,
              ));
            }
          }

          await persistState();
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'end', finalResponse: fullAnswer })}\n\n`,
          ));
          controller.close();
        } catch {
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'error', message: 'Ошибка генерации ответа' })}\n\n`,
          ));
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    });
  } catch (error) {
    const msg = safeMsg(error);
    return NextResponse.json({ error: 'Ошибка сервера', details: msg }, { status: 500 });
  }
}
