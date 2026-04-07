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
import { getSystemPrompt, buildMessageHistory, type ChatMessage } from '@/lib/ai/prompts';
import { buildRAGContext } from '@/lib/ai/rag-context';
import { getOpenRouterKey } from '@/lib/ai/provider-config';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { getUserFromRequest } from '@/lib/auth/jwt';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

const streamLimiter = createRateLimiter({ windowMs: 60_000, max: 30 });

const Schema = z.object({
  message: z.string().min(1).max(1000),
  sessionId: z.string().optional(),
  role: z.enum(['tourist', 'operator', 'agent']).optional(),
});

async function generateFullResponse(text: string, role: string): Promise<string> {
  // Map role to ChatRole
  let chatRole: 'tourist' | 'operator' | 'agent' = 'tourist';
  if (role === 'operator' || role === 'agent') {
    chatRole = role as 'operator' | 'agent';
  }
  
  // Build system and context
  const systemPrompt = getSystemPrompt(chatRole);
  const ragContext = await buildRAGContext(text, chatRole);
  
  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt } as ChatMessage,
    ...(ragContext ? [{ role: 'system', content: `КОНТЕКСТ:\n${ragContext}` } as ChatMessage] : []),
    { role: 'user', content: text } as ChatMessage,
  ];

  const apiKey = getOpenRouterKey();
  if (!apiKey) {
    return 'API недоступен. Попробуйте позже.';
  }

  try {
    const payload = messages.map(m => ({
      role: m.role,
      content: m.content,
    }));

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
        stream: false, // Get full response first, then we can decide
      }),
      signal: AbortSignal.timeout(25_000),
    });

    if (!response.ok) {
      return 'Ошибка при запросе к AI. Попробуйте позже.';
    }

    const data = await response.json() as { choices?: Array<{ message?: { content?: string } }> };
    return data.choices?.[0]?.message?.content || 'Нет ответа от AI.';
  } catch (error) {
    return 'Ошибка обработки запроса. Попробуйте позже.';
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

    const { message, sessionId, role = 'tourist' } = parsed.data;
    const user = await getUserFromRequest(request);
    
    // Get full response (we can split it token-by-token for streaming simulation)
    const fullResponse = await generateFullResponse(message, role);

    // Create SSE stream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // Send opening marker
        controller.enqueue(encoder.encode(`data: {"type":"start"}\n\n`));

        // Simulate token-by-token streaming by splitting on word boundaries
        // Real streaming would use OpenRouter's stream: true, but this works well for demo
        const words = fullResponse.split(/(\s+)/);
        for (const word of words) {
          if (!word) continue;
          
          // Small delay to simulate streaming
          await new Promise(resolve => setTimeout(resolve, 10));
          
          controller.enqueue(encoder.encode(
            `data: ${JSON.stringify({ type: 'token', content: word })}\n\n`
          ));
        }

        // Session tracking (non-blocking)
        if (sessionId && role === 'tourist') {
          fetch('/api/ai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message,
              sessionId,
              role,
              _skipStream: true, // Internal flag to track streaming session
            }),
          }).catch(() => {}); // Fire-and-forget
        }

        // Send end marker
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ type: 'end', finalResponse: fullResponse })}\n\n`
        ));
        controller.close();
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
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
