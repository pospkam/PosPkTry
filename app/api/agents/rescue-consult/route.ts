import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { callAIWithModelDirect } from '@/lib/ai/providers';
import { getModelForAgent } from '@/lib/ai/agent-models';
import { getFullDangerSummary } from '@/lib/agents/agencies/danger-analyst-agency';
import { query } from '@/lib/database';
import type { ChatMessage } from '@/lib/ai/prompts';

/**
 * POST /api/agents/rescue-consult
 * Консультация МЧС с AI Спасателем
 * AI использует актуальную оценку угроз от Аналитика Опасностей
 *
 * Body: { message: string; history: ChatMessage[] }
 * Returns: { reply: string; consultation_id?: string }
 */
export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (auth instanceof NextResponse) return auth;

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Неверный формат запроса' }, { status: 400 });
  }

  if (
    typeof body !== 'object' || body === null ||
    typeof (body as Record<string, unknown>).message !== 'string'
  ) {
    return NextResponse.json({ error: 'Поле message обязательно' }, { status: 400 });
  }

  const { message, history = [] } = body as { message: string; history: ChatMessage[] };
  if (!message.trim()) {
    return NextResponse.json({ error: 'Сообщение не может быть пустым' }, { status: 400 });
  }

  // Получаем актуальную оценку угроз от Аналитика
  let dangerContext = '';
  try {
    dangerContext = await getFullDangerSummary();
  } catch {
    dangerContext = 'Данные оценки угроз временно недоступны. Опирайтесь на общую обстановку.';
  }

  // Собираем историю с системным контекстом
  const systemPrompt =
    `Ты — AI Спасатель, главный оперативный офицер SAR Камчатки. ` +
    `Ты консультируешь представителя МЧС в режиме реального времени. ` +
    `Отвечай на русском языке, чётко и по существу. ` +
    `Давай конкретные рекомендации с учётом реальных данных.\n\n` +
    `--- ТЕКУЩАЯ ОБСТАНОВКА (данные AI Аналитика Опасностей) ---\n` +
    dangerContext;

  const messages: ChatMessage[] = [
    { role: 'system', content: systemPrompt },
    // История предыдущих сообщений (последние 10)
    ...history.slice(-10).map(h => ({ role: h.role, content: h.content })),
    { role: 'user', content: message },
  ];

  let reply: string;
  try {
    reply = await callAIWithModelDirect(messages, getModelForAgent('rescue'));
  } catch {
    return NextResponse.json(
      { error: 'AI Спасатель временно недоступен. Попробуйте через несколько секунд.' },
      { status: 503 }
    );
  }

  // Логируем консультацию
  try {
    await query(
      `INSERT INTO ai_actions_log (action_type, agent_id, input_summary, result_summary, success)
       VALUES ('rescue_consult', 'rescue', $1, $2, true)`,
      [message.slice(0, 200), reply.slice(0, 200)]
    );
  } catch { /* не критично */ }

  return NextResponse.json({ reply });
}
