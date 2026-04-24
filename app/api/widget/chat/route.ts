/**
 * POST /api/widget/chat
 * AI chat endpoint for partner-embedded widget.
 * No auth required — validated by partner slug + domain whitelist.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';
import { callAIWithModelDirect } from '@/lib/ai/providers';
import { getModelForAgent } from '@/lib/ai/agent-models';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { safeMsg } from '@/lib/errors/sanitize';
import { buildRAGContext } from '@/lib/ai/rag-context';
import { createLead } from '@/lib/leads/create';

export const dynamic = 'force-dynamic';

const widgetRateLimiter = createRateLimiter({ windowMs: 60_000, max: 15 });

const WidgetChatSchema = z.object({
  partnerId: z.string().min(1, 'partnerId is required'),
  sessionId: z.string().min(1, 'sessionId is required'),
  message: z.string().min(1, 'message is required').max(2000),
  history: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string(),
  })).max(20).optional(),
});

interface PartnerRow {
  id: string;
  name: string;
  category: string;
  description: string | null;
  widget_config: Record<string, unknown>;
  widget_domains: string[];
}

function getCorsHeaders(origin: string | null, allowedDomains: string[]): Record<string, string> {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };

  if (!origin) return headers;

  try {
    const originHost = new URL(origin).hostname;
    const isAllowed = allowedDomains.some(d => {
      const clean = d.replace(/^https?:\/\//, '').replace(/\/.*$/, '');
      return originHost === clean || originHost.endsWith(`.${clean}`);
    });
    if (isAllowed) {
      headers['Access-Control-Allow-Origin'] = origin;
    }
  } catch {
    // Invalid origin — skip
  }

  return headers;
}

function buildWidgetSystemPrompt(partner: PartnerRow): string {
  const greeting = (partner.widget_config as Record<string, string>)?.greeting || '';
  return `Ты - AI-помощник туристической платформы TourHub Камчатка, встроенный на сайт партнёра "${partner.name}".
Партнёр: ${partner.name} (${partner.category})${partner.description ? `. ${partner.description}` : ''}.
${greeting ? `Приветствие: ${greeting}` : ''}

Твои задачи:
- Помогать посетителям сайта партнёра узнать о турах и маршрутах на Камчатке
- Отвечать на вопросы о турах, ценах, сезонах, погоде
- Предлагать подходящие маршруты и активности
- Если посетитель заинтересован — предлагать оставить заявку

Правила:
- Отвечай на русском языке
- Будь дружелюбным, кратким и полезным
- Не выдумывай цены и даты — если не знаешь, предложи оставить заявку
- Максимум 3-4 предложения в ответе
- Упоминай партнёра "${partner.name}" уместно, но не навязчиво`;
}

export async function OPTIONS(request: NextRequest) {
  const origin = request.headers.get('origin');
  // For OPTIONS preflight, allow all widget origins
  const headers = getCorsHeaders(origin, ['*']);
  headers['Access-Control-Allow-Origin'] = origin || '*';
  return new NextResponse(null, { status: 204, headers });
}

export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  if (!widgetRateLimiter.check(ip)) {
    return NextResponse.json(
      { success: false, error: 'Слишком много запросов' },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const parsed = WidgetChatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      );
    }

    const { partnerId, sessionId, message, history = [] } = parsed.data;

    // Find partner by slug
    const partnerResult = await query<PartnerRow>(
      `SELECT id, name, category, description, widget_config, widget_domains
       FROM partners
       WHERE slug = $1 AND widget_enabled = true
       LIMIT 1`,
      [partnerId]
    );

    const partner = partnerResult.rows[0];
    if (!partner) {
      return NextResponse.json(
        { success: false, error: 'Partner not found or widget not enabled' },
        { status: 404 }
      );
    }

    // Validate origin against allowed domains
    const origin = request.headers.get('origin');
    const corsHeaders = getCorsHeaders(origin, partner.widget_domains);

    // Build AI messages
    const systemPrompt = buildWidgetSystemPrompt(partner);
    const ragContext = await buildRAGContext(message, 'tourist');

    const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
      { role: 'system' as const, content: systemPrompt + ragContext },
      ...history.slice(-10).map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: 'user' as const, content: message },
    ];

    const answer = await callAIWithModelDirect(messages, getModelForAgent('kuzmich'));

    // Save to chat_sessions (fire-and-forget)
    const widgetSessionId = `widget_${partnerId}_${sessionId}`;
    const allMessages = [
      ...history,
      { role: 'user', content: message },
      { role: 'assistant', content: answer },
    ];

    void query(
      `INSERT INTO chat_sessions (session_id, role, messages, user_message_count, is_authenticated, updated_at)
       VALUES ($1, 'tourist', $2::jsonb, $3, false, NOW())
       ON CONFLICT (session_id) DO UPDATE
         SET messages = $2::jsonb,
             user_message_count = $3,
             updated_at = NOW()`,
      [widgetSessionId, JSON.stringify(allMessages.slice(-20)), allMessages.filter(m => m.role === 'user').length]
    );

    // Create lead on first message (fire-and-forget)
    if (history.length === 0) {
      void createLead({
        name: `Widget: ${partnerId}`,
        comment: message.slice(0, 500),
        source_url: origin || partnerId,
        source_data: { type: 'widget', partner_id: partnerId, partner_name: partner.name, domain: origin },
        status: 'new',
      }).catch((err) => console.error('[widget] createLead failed:', err));
    }

    return NextResponse.json(
      { success: true, data: { answer } },
      { headers: corsHeaders }
    );
  } catch (error: unknown) {
    const msg = safeMsg(error);
    return NextResponse.json(
      { success: false, error: 'Ошибка обработки запроса', details: msg },
      { status: 500 }
    );
  }
}
