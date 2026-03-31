/**
 * POST /api/agents/query
 * Запрос напрямую к определённому агенту (без полного совещания)
 *
 * Claude/Developer может запросить данные от конкретного агента.
 * Используется для быстрой диагностики и удаления неопределённости.
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { requireAdmin } from '@/lib/auth/middleware';
import { callAIWithModel } from '@/lib/ai/providers';
import type { ChatMessage } from '@/lib/ai/prompts';
import { pool } from '@/lib/db-pool';

const QuerySchema = z.object({
  agent_id: z.enum(['admin', 'hacker', 'content', 'quality', 'security', 'eco', 'legal', 'rescue', 'planning', 'evo']),
  question: z.string().min(10).max(500),
  context: z.record(z.unknown()).optional(),
});

type QueryRequest = z.infer<typeof QuerySchema>;

interface AgentMetadata {
  name: string;
  role: string;
  expertise: string[];
  systemPrompt: string;
}

const AGENT_METADATA: Record<string, AgentMetadata> = {
  admin: {
    name: 'Admin',
    role: 'Операционный директор',
    expertise: ['metrics', 'operational_data', 'performance'],
    systemPrompt: `Ты операционный директор платформы TourHab.
Твоя задача: находить факты в данных, отвечать на вопросы о метриках и операционных показателях.
Ответ должен быть структурирован: ФАКТЫ → АНАЛИЗ → РЕКОМЕНДАЦИЯ.
Будь честен: если данные неполные или противоречивые — скажи об этом.`,
  },
  hacker: {
    name: 'Hacker',
    role: 'Директор по росту',
    expertise: ['conversion', 'growth', 'user_behavior', 'funnel'],
    systemPrompt: `Ты директор по росту. Фокусируешься на конверсии, привлечении, активации.
Анализируй воронку, ищи узкие места, предлагай эксперименты.`,
  },
  content: {
    name: 'Content',
    role: 'Контент-аудитор',
    expertise: ['content_quality', 'descriptions', 'seo', 'user_experience'],
    systemPrompt: `Ты аудитор контента. Проверяешь качество описаний маршрутов, фото, метаданных.
Ответ: какие маршруты нуждаются в улучшении, почему, как исправить.`,
  },
  quality: {
    name: 'Quality',
    role: 'Директор по качеству',
    expertise: ['ratings', 'reviews', 'operator_performance', 'complaints'],
    systemPrompt: `Ты руководитель качества. Анализируешь отзывы, рейтинги операторов, жалобы.
Фокус: какие операторы деградируют, почему, что делать.`,
  },
  security: {
    name: 'Security',
    role: 'Безопасность',
    expertise: ['fraud', 'anomalies', 'access_control', 'threats'],
    systemPrompt: `Ты начальник безопасности. Ищешь аномалии, мошенничество, угрозы.
Ответ: риск ≥ 0-100%, как миtigировать.`,
  },
  evo: {
    name: 'Evo',
    role: 'Архитектор системы',
    expertise: ['architecture', 'systems', 'scalability', 'meta_analysis'],
    systemPrompt: `Ты архитектор платформы. Смотришь на системы изнутри, видишь зависимости.
Анализируй問題 на уровне архитектуры, не отдельных фич.`,
  },
  legal: {
    name: 'Legal',
    role: 'Юрист',
    expertise: ['compliance', 'contracts', 'risks', 'regulations'],
    systemPrompt: `Ты юристконсульт. Анализируешь юридические риски, compliance.`,
  },
  rescue: {
    name: 'Rescue',
    role: 'Начальник SAR',
    expertise: ['sos', 'emergency', 'weather', 'safety'],
    systemPrompt: `Ты начальник поисково-спасательных операций. Мониторишь SOS, погоду, риски.`,
  },
  planning: {
    name: 'Planning',
    role: 'Стратег',
    expertise: ['forecasts', 'seasonality', 'planning', 'demand'],
    systemPrompt: `Ты стратег по планированию. Прогнозируешь спрос, сезонность, дефициты.`,
  },
};

export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const parse = QuerySchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parse.error.issues },
      { status: 422 }
    );
  }

  const { agent_id, question, context } = parse.data;
  const agent = AGENT_METADATA[agent_id];

  if (!agent) {
    return NextResponse.json({ error: 'Unknown agent' }, { status: 404 });
  }

  // Подготовим контекст для агента
  let contextData = '';
  if (context) {
    contextData = `\n\nДополнительный контекст:\n${JSON.stringify(context, null, 2)}`;
  }

  // Если нужны данные из БД — добавим их
  let dbContext = '';
  if (agent_id === 'admin' || agent_id === 'hacker') {
    try {
      const pageViews = await pool.query<{ cnt: string }>(
        `SELECT COUNT(*) as cnt FROM page_views WHERE created_at >= NOW() - INTERVAL '7 days'`
      );
      const leads = await pool.query<{ cnt: string }>(
        `SELECT COUNT(*) as cnt FROM leads WHERE created_at >= NOW() - INTERVAL '7 days'`
      );
      const bookings = await pool.query<{ cnt: string }>(
        `SELECT COUNT(*) as cnt FROM bookings WHERE created_at >= NOW() - INTERVAL '7 days'`
      );
      dbContext = `\n\nДанные из БД (за 7 дней):
- Page views: ${pageViews.rows[0]?.cnt ?? 0}
- Leads: ${leads.rows[0]?.cnt ?? 0}
- Bookings: ${bookings.rows[0]?.cnt ?? 0}`;
    } catch (e) {
      dbContext = `\n⚠️ Ошибка при загрузке данных БД: ${String(e).slice(0, 100)}`;
    }
  }

  const fullPrompt = `${agent.systemPrompt}\n\nВопрос:\n${question}${dbContext}${contextData}`;

  const messages: ChatMessage[] = [
    {
      role: 'system',
      content: agent.systemPrompt,
    },
    {
      role: 'user',
      content: `${question}${dbContext}${contextData}`,
    },
  ];

  try {
    const { text: responseText } = await callAIWithModel(messages, 'fast');

    // Сохраняем в БД для истории
    await pool.query(
      `INSERT INTO ai_actions_log (action_type, metadata)
       VALUES ('agent_query', $1)`,
      [
        JSON.stringify({
          agent_id,
          agent_name: agent.name,
          question,
          response_length: responseText.length,
          timestamp: new Date().toISOString(),
        }),
      ]
    ).catch(() => {
      // Silent fail if logging fails
    });

    return NextResponse.json({
      success: true,
      agent: {
        id: agent_id,
        name: agent.name,
        role: agent.role,
      },
      question,
      response: responseText,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: 'Failed to get response from agent',
        details: String(error).slice(0, 200),
      },
      { status: 500 }
    );
  }
}
