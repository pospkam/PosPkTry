/**
 * POST /api/ai/chat
 * AI chat with role support, memory (10 messages), anti-hallucination.
 * 5 free messages for anonymous users, unlimited for authenticated.
 * Encrypted interest collection from user messages.
 */

import { safeMsg } from '@/lib/errors/sanitize';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getSystemPrompt, buildMessageHistory, ChatRole, ChatMessage } from '@/lib/ai/prompts';
import { query } from '@/lib/database';
import { pool } from '@/lib/db-pool';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { callAIWithModelDirect } from '@/lib/ai/providers';
import { getModelForAgent } from '@/lib/ai/agent-models';
import { getUserFromRequest } from '@/lib/auth/jwt';
import { extractAndEncryptInterests } from '@/lib/ai/interest-extractor';
import { PlatformAgent } from '@/lib/agents/platform-agent';
import {
  loadUserMemory,
  upsertUserMemory,
  extractMemoryFromMessage,
  buildMemoryContext,
  buildAgentInsightsForTourist,
  loadTripHistory,
  synthesizeUserNotes,
  addViewedTour,
} from '@/lib/ai/user-memory';
import { detectTourIntent, findRelevantTours, type TourSuggestion } from '@/lib/ai/booking-intent';
import { recordEngagementSignal } from '@/lib/kuzmich/engagement';
import { buildRAGContext, buildGeoContext } from '@/lib/ai/rag-context';
import { recordTouristDemand } from '@/lib/ai/tourist-demand-aggregator';
import { runSDKAgent } from '@/lib/agents/sdk/sdk-runner';
import { getTouristTools } from '@/lib/agents/sdk/tourist-tools';
import { getOperatorTools } from '@/lib/agents/sdk/operator-tools';

export const dynamic = 'force-dynamic';

const FREE_MESSAGE_LIMIT = 10;

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
  interestsEncrypted: string | null,
  utm?: { referrerSource?: string; utmSource?: string; utmMedium?: string; utmCampaign?: string },
): Promise<void> {
  if (!sessionId) return;
  const trimmed = messages.slice(-20);
  try {
    await query(
      `INSERT INTO chat_sessions
         (session_id, user_id, role, messages, user_message_count, is_authenticated,
          interests_encrypted, referrer_source, utm_source, utm_medium, utm_campaign, updated_at)
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10, $11, NOW())
       ON CONFLICT (session_id) DO UPDATE
         SET messages               = $4::jsonb,
             user_message_count     = $5,
             is_authenticated       = $6,
             interests_encrypted    = COALESCE($7, chat_sessions.interests_encrypted),
             referrer_source        = COALESCE(chat_sessions.referrer_source, $8),
             utm_source             = COALESCE(chat_sessions.utm_source, $9),
             utm_medium             = COALESCE(chat_sessions.utm_medium, $10),
             utm_campaign           = COALESCE(chat_sessions.utm_campaign, $11),
             updated_at             = NOW(),
             role                   = $3`,
      [
        sessionId, userId, role, JSON.stringify(trimmed), userMessageCount, isAuthenticated,
        interestsEncrypted,
        utm?.referrerSource ?? null, utm?.utmSource ?? null,
        utm?.utmMedium ?? null, utm?.utmCampaign ?? null,
      ],
    );
  } catch {
    // Non-critical
  }
}

// ── POST handler ──────────────────────────────────────────────────
const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
});

const AiChatSchema = z.object({
  message: z.string().min(1, 'Сообщение обязательно'),
  sessionId: z.string().optional(),
  role: z.string().default('tourist'),
  userId: z.string().nullable().default(null),
  // Client-side history fallback (used when DB session is unavailable)
  history: z.array(ChatMessageSchema).max(20).optional(),
  // Vision: base64-encoded image from user
  imageBase64: z.string().max(8_000_000).optional(),
  imageMimeType: z.string().optional(),
  // Geo: user coordinates (from browser geolocation)
  userLocation: z.object({
    lat: z.number(),
    lng: z.number(),
    accuracy: z.number().optional(),
    timestamp: z.number().optional(),
  }).optional(),
  // UTM & referrer (saved only on first message)
  referrerSource: z.string().max(255).optional(),
  utmSource:      z.string().max(100).optional(),
  utmMedium:      z.string().max(100).optional(),
  utmCampaign:    z.string().max(100).optional(),
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

    const { message, sessionId, role = 'tourist', history: clientHistory, imageBase64, imageMimeType,
            userLocation,
            referrerSource, utmSource, utmMedium, utmCampaign } = parsed.data;

    if (!message?.trim()) {
      return NextResponse.json({ success: false, error: 'Сообщение не может быть пустым' }, { status: 400 });
    }

    // Auth check — 3 free messages for anonymous, then require registration
    const user = await getUserFromRequest(request);
    const isAuthenticated = !!user;

    const validRoles: ChatRole[] = ['tourist', 'operator', 'guide', 'admin', 'agent', 'transfer'];
    const safeRole: ChatRole = validRoles.includes(role as ChatRole) ? (role as ChatRole) : 'tourist';

    // Load session from DB; fall back to client-provided history if DB has nothing
    const session = sessionId ? await loadSession(sessionId) : null;
    const currentCount = session?.user_message_count ?? 0;
    const history: ChatMessage[] = (session?.messages?.length ? session.messages : null)
      ?? (clientHistory as ChatMessage[] | undefined)
      ?? [];
    const isNewSession = !session;

    // Check limit for anonymous users
    if (!isAuthenticated && currentCount >= FREE_MESSAGE_LIMIT) {
      return NextResponse.json({
        success: true,
        data: {
          limitReached: true,
          authRequired: true,
          message: 'Зарегистрируйтесь, чтобы продолжить общение с AI-помощником Кузьмичом. Это бесплатно!',
          registerUrl: '/auth/login',
          userMessageCount: currentCount,
          remainingFree: 0,
        },
      });
    }

    // Долгосрочная память (только для авторизованных)
    // userId — UUID строка (users.id uuid), НЕ parseInt
    const userId = user?.userId ?? null;
    const [userMemory, tripHistory] = await Promise.all([
      userId ? loadUserMemory(userId) : Promise.resolve(null),
      userId ? loadTripHistory(userId) : Promise.resolve([]),
    ]);

    // Vision: анализ фото от пользователя (Gemini)
    let visionDescription: string | null = null;
    if (imageBase64 && imageMimeType && safeRole === 'tourist') {
      try {
        const { callGeminiVision } = await import('@/lib/ai/providers');
        visionDescription = await callGeminiVision(
          imageBase64,
          imageMimeType,
          'Опиши что на фото: место, активность, природа Камчатки. Кратко, 1-2 предложения. Если узнаёшь локацию — назови. Отвечай на русском.',
        );
      } catch { /* не блокируем */ }
    }

    // Build AI prompt
    const rawMessage = message.trim();
    const messageWithVision = visionDescription
      ? `[Фото пользователя: ${visionDescription}]${rawMessage ? `\n\n${rawMessage}` : ''}`
      : rawMessage;
    const userMsg: ChatMessage = { role: 'user', content: messageWithVision, timestamp: Date.now() };
    history.push(userMsg);

    const basePrompt   = getSystemPrompt(safeRole);
    const memContext   = userMemory ? buildMemoryContext(userMemory, tripHistory) : '';

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

    // Agentic Operator: authenticated operators → SDK tool calling for tour/booking management
    if (!answer && safeRole === 'operator' && isAuthenticated && userId) {
      try {
        const partnerRes = await pool.query<{ id: string }>(
          `SELECT id::text FROM partners WHERE user_id = $1 LIMIT 1`, [userId],
        );
        const partnerId = partnerRes.rows[0]?.id;
        if (partnerId) {
          const opTools = getOperatorTools(partnerId);
          const sdkResult = await runSDKAgent({
            agentId: 'operator',
            intent: 'operator_management',
            systemPrompt: systemPrompt + `\n\nТы — AI-ассистент оператора туров на Камчатке. ` +
              `Используй инструменты для просмотра туров, бронирований, выручки. ` +
              `При запросе изменения цены или публикации — выполняй через инструменты. ` +
              `Отвечай кратко, с цифрами. Не придумывай данных.`,
            userMessage: message.trim(),
            tools: opTools,
            model: getModelForAgent('kuzmich') ?? 'openai/gpt-4o-mini',
            maxIterations: 4,
          });
          if (sdkResult.response) answer = sdkResult.response;
        }
      } catch { /* fall through to PlatformAgent / simple AI */ }
    }

    // Agentic Booking: authenticated tourists with booking/tour intent → SDK tool calling
    if (!answer && safeRole === 'tourist' && isAuthenticated) {
      const intentResult = detectTourIntent(message.trim());
      if (intentResult.detected) {
        try {
          const tools = getTouristTools(userId);
          const sdkResult = await runSDKAgent({
            agentId: 'kuzmich',
            intent: 'conversational_booking',
            systemPrompt: systemPrompt +
              `\n\nТы можешь использовать инструменты для поиска туров, проверки дат и мест. ` +
              `Когда турист спрашивает о турах — ОБЯЗАТЕЛЬНО используй search_tours. ` +
              `Когда турист говорит о поездке на несколько дней (7, 10, 14 дней), упоминает бюджет ` +
              `и несколько активностей — используй compose_trip для составления итинерария. ` +
              `Триггеры compose_trip: "сколько дней", "планирую поездку", "хочу объединить", ` +
              `"маршрут на ... дней", "что посмотреть за ... дней", "составь программу". ` +
              `После compose_trip — опиши итинерарий кратко (тур, даты, цена) и предложи забронировать. ` +
              `Отвечай конкретно: название, цена, даты. Не придумывай данные.`,
            userMessage: message.trim(),
            tools,
            model: getModelForAgent('kuzmich') ?? 'openai/gpt-4o-mini',
            maxIterations: 4,
          });
          if (sdkResult.response) answer = sdkResult.response;
        } catch { /* fall through to simple AI */ }
      }
    }

    answer ??= await callAIWithModelDirect(messagesForAI, getModelForAgent('kuzmich'));

    // Tour suggestions — only for tourist role (fire-and-forget fetch, non-blocking)
    let tourSuggestions: TourSuggestion[] = [];
    if (safeRole === 'tourist') {
      const intentResult = detectTourIntent(rawMessage);
      if (intentResult.detected) {
        tourSuggestions = await findRelevantTours(intentResult.activityType, intentResult.rawWords);
      }
    }

    // Booking form: показываем inline-форму когда турист явно хочет забронировать
    const BOOKING_TRIGGERS_CHAT = ['бронь', 'бронирую', 'бронировать', 'хочу этот', 'хочу забронировать', 'записывай', 'оформи', 'беру', 'берём', 'запишите', 'возьму', 'возьмём', 'оплачу', 'работаем', 'договорились', 'давай бронируем', 'подходит'];
    const bookingTriggered = safeRole === 'tourist' && BOOKING_TRIGGERS_CHAT.some(t => rawMessage.toLowerCase().includes(t));
    const bookingFormTour = bookingTriggered && tourSuggestions.length > 0 ? tourSuggestions[0] : null;

    const assistantMsg: ChatMessage = { role: 'assistant', content: answer, timestamp: Date.now() };
    history.push(assistantMsg);

    // Increment count and extract interests
    const newCount = currentCount + 1;
    const interestsEncrypted = extractAndEncryptInterests(message, session?.interests_encrypted ?? null);

    // Обновить долгосрочную память пользователя (fire-and-forget, не блокирует ответ)
    const extracted = extractMemoryFromMessage(message.trim());
    if (userId) {
      void upsertUserMemory(userId, extracted, true, isNewSession);
      // Трекинг просмотренного тура (для re-engagement + smart memory)
      if (bookingFormTour) {
        void addViewedTour(userId, bookingFormTour.id);
        void recordEngagementSignal(userId, bookingFormTour.id, sessionId ?? null, 'viewed');
      }
    }

    // Синтез заметок о пользователе (fire-and-forget, каждые 5 сообщений)
    if (userId && safeRole === 'tourist' && newCount % 5 === 0) {
      void synthesizeUserNotes(userId, history, userMemory?.ai_notes ?? null);
    }

    // Bridge tourist demand to agent system (fire-and-forget)
    if (safeRole === 'tourist') {
      const intentResult = detectTourIntent(message.trim());
      void recordTouristDemand({
        userId,
        activities: extracted.preferred_activities ?? [],
        locations: extracted.preferred_locations ?? [],
        travelStyle: extracted.travel_style ?? null,
        budgetLevel: extracted.budget_level ?? null,
        bookingIntentDetected: intentResult.detected,
        sessionId: sessionId ?? null,
      });
    }

    // Save
    if (sessionId) {
      await saveSession(sessionId, user?.userId ?? null, safeRole, history, newCount, isAuthenticated, interestsEncrypted,
        { referrerSource, utmSource, utmMedium, utmCampaign });
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
        ...(visionDescription ? { visionDescription } : {}),
        ...(bookingFormTour ? { bookingForm: { tourId: bookingFormTour.id, tourTitle: bookingFormTour.title, tourPrice: bookingFormTour.base_price, tourImage: bookingFormTour.tour_image, operatorName: bookingFormTour.operator_name } } : {}),
      },
    });
  } catch (error) {
    const msg = safeMsg(error);
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
    const msg = safeMsg(error);
    return NextResponse.json({ success: false, error: 'Ошибка загрузки истории', details: msg }, { status: 500 });
  }
}
