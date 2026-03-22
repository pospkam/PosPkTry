import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const AgentPlanSchema = z.object({
  query: z.string().min(1, 'Поле query обязательно'),
  group_size: z.number({ coerce: true }).int().positive().optional().default(1),
  duration_days: z.number({ coerce: true }).int().positive().optional().default(2),
  difficulty: z.string().optional(),
});

/**
 * POST /api/agent/plan
 * 
 * Планирование тура через CrewAI агентов
 * 
 * Пример:
 * POST /api/agent/plan
 * {
 *   "query": "Хочу на вулкан в июле",
 *   "group_size": 3,
 *   "duration_days": 2,
 *   "difficulty": "Средний"
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsed = AgentPlanSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      );
    }
    const { query, group_size, duration_days, difficulty } = parsed.data;

    // Пытаемся подключить FastAPI (если запущен)
    const crewaiUrl = process.env.CREWAI_API_URL || 'http://localhost:8001';
    
    try {
      const response = await fetch(`${crewaiUrl}/api/plan`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          group_size,
          duration_days,
          difficulty,
        }),
        signal: AbortSignal.timeout(30000), // 30 сек timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      return NextResponse.json({
        success: true,
        source: 'crewai',
        data,
      });
    } catch (crewaiError) {
      
      // Fallback: локальный поиск по базе знаний
      return NextResponse.json({
        success: true,
        source: 'fallback',
        data: {
          plan: {
            title: 'Тур на Камчатку',
            query,
            group_size,
            duration_days,
            highlights: ['Запланируйте тур через основной интерфейс'],
          },
          message: 'CrewAI агенты в разработке. Используйте основной поиск.',
        },
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Ошибка обработки запроса' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/agent/search
 * 
 * Поиск маршрутов через агентов
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const difficulty = searchParams.get('difficulty');
    const limit = parseInt(searchParams.get('limit') || '5');

    const crewaiUrl = process.env.CREWAI_API_URL || 'http://localhost:8001';

    try {
      const response = await fetch(
        `${crewaiUrl}/api/search?category=${category || ''}&difficulty=${difficulty || ''}&limit=${limit}`,
        { signal: AbortSignal.timeout(30000) }
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();
      
      return NextResponse.json({
        success: true,
        source: 'crewai',
        data,
      });
    } catch {
      // Fallback
      return NextResponse.json({
        success: true,
        source: 'fallback',
        data: {
          results: [],
          message: 'CrewAI агенты в разработке',
        },
      });
    }
  } catch (error) {
    return NextResponse.json(
      { error: 'Ошибка поиска' },
      { status: 500 }
    );
  }
}
