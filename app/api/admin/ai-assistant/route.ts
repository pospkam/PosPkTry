import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireAdmin } from '@/lib/auth/middleware';
import { callAIWithModelDirect } from '@/lib/ai/providers';
import { getModelForAgent } from '@/lib/ai/agent-models';
import type { ChatMessage } from '@/lib/ai/prompts';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';
import { z } from 'zod';

const AiAssistantSchema = z.object({
  question: z.string().min(1, 'Вопрос не может быть пустым').max(2000, 'Вопрос слишком длинный'),
});

export const dynamic = 'force-dynamic';

const assistantLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

/**
 * POST /api/admin/ai-assistant
 * Admin AI Q&A — sends question + platform metrics context to AI
 */
export async function POST(request: NextRequest) {
  try {
    const adminOrResponse = await requireAdmin(request);
    if (adminOrResponse instanceof NextResponse) return adminOrResponse;

    const ip = getClientIp(request.headers);
    if (!assistantLimiter.check(ip)) {
      return NextResponse.json(
        { success: false, error: 'Слишком много запросов. Подождите минуту.' },
        { status: 429 }
      );
    }

    const body = await request.json();
    const parsed = AiAssistantSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      );
    }
    const question = parsed.data.question.trim();

    // Fetch quick metrics for context
    let bookings30d = 0;
    let revenue30d = 0;
    let totalUsers = 0;
    let activeTours = 0;
    let pendingPartners = 0;

    try {
      const r = await query<{ cnt: string }>(
        `SELECT COUNT(*) as cnt FROM bookings WHERE created_at >= NOW() - INTERVAL '30 days'`, []
      );
      bookings30d = parseInt(r.rows[0]?.cnt ?? '0', 10);
    } catch { /* 0 */ }

    try {
      const r = await query<{ rev: string }>(
        `SELECT COALESCE(SUM(total_price), 0) as rev FROM bookings WHERE created_at >= NOW() - INTERVAL '30 days'`, []
      );
      revenue30d = parseFloat(r.rows[0]?.rev ?? '0');
    } catch { /* 0 */ }

    try {
      const r = await query<{ cnt: string }>('SELECT COUNT(*) as cnt FROM users', []);
      totalUsers = parseInt(r.rows[0]?.cnt ?? '0', 10);
    } catch { /* 0 */ }

    try {
      const r = await query<{ cnt: string }>(
        'SELECT COUNT(*) as cnt FROM tours WHERE is_active = true', []
      );
      activeTours = parseInt(r.rows[0]?.cnt ?? '0', 10);
    } catch { /* 0 */ }

    try {
      const r = await query<{ cnt: string }>(
        'SELECT COUNT(*) as cnt FROM partners WHERE is_verified = false', []
      );
      pendingPartners = parseInt(r.rows[0]?.cnt ?? '0', 10);
    } catch { /* 0 */ }

    const today = new Date().toLocaleDateString('ru-RU');
    const systemPrompt = `Ты — AI-ассистент администратора платформы KamchatourHub (туризм Камчатки).
Отвечай кратко и по делу на русском языке.

ТЕКУЩИЕ МЕТРИКИ ПЛАТФОРМЫ (${today}):
- Бронирований за 30 дней: ${bookings30d}
- Выручка за 30 дней: ${revenue30d.toLocaleString('ru-RU')} ₽
- Всего пользователей: ${totalUsers}
- Активных туров: ${activeTours}
- Партнёров на верификации: ${pendingPartners}

Используй эти данные при ответе. Не придумывай цифры, которых нет выше.
Если вопрос выходит за рамки платформы — вежливо откажись.`;

    const messages: ChatMessage[] = [
      { role: 'system', content: systemPrompt, timestamp: Date.now() },
      { role: 'user', content: question, timestamp: Date.now() },
    ];

    const answer = await callAIWithModelDirect(messages, getModelForAgent('admin'));

    return NextResponse.json({
      success: true,
      data: { answer },
    });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: 'Ошибка AI ассистента' },
      { status: 500 }
    );
  }
}
