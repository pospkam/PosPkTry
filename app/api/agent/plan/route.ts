import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

interface AgentPlanRequest {
  query: string;
  group_size?: number;
  duration_days?: number;
  difficulty?: string;
}

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
    const body = await request.json() as AgentPlanRequest;
    const { query, group_size = 1, duration_days = 2, difficulty } = body;

    if (!query) {
      return NextResponse.json(
        { error: 'query обязателен' },
        { status: 400 }
      );
    }

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
      console.warn('[AGENT] CrewAI сервер не доступен, используем fallback');
      
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
    console.error('[AGENT]', error);
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
    console.error('[AGENT]', error);
    return NextResponse.json(
      { error: 'Ошибка поиска' },
      { status: 500 }
    );
  }
}
