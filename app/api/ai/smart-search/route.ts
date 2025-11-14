import { NextResponse } from 'next/server';

/**
 * AI KAM - Smart Search API
 * Умный поиск туров с AI рекомендациями
 */
export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Query is required' },
        { status: 400 }
      );
    }

    // TODO: Интеграция с GROQ/AI для умного анализа запроса
    // Пока возвращаем простой поиск
    
    const keywords = extractKeywords(query);
    const filters = analyzeQuery(query);

    // Поиск туров с учетом AI анализа
    const tours = await searchToursWithAI(keywords, filters);

    return NextResponse.json({
      success: true,
      query,
      keywords,
      filters,
      results: tours,
      ai_suggestions: generateSuggestions(query),
    });
  } catch (error) {
    console.error('AI Smart Search error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Извлечение ключевых слов
 */
function extractKeywords(query: string): string[] {
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter(word => word.length > 2);
  
  return [...new Set(keywords)];
}

/**
 * Анализ запроса для фильтров
 */
function analyzeQuery(query: string): {
  difficulty?: string;
  maxPrice?: number;
  duration?: number;
  season?: string;
} {
  const filters: any = {};
  
  // Определение сложности
  if (/начинающ|легк|простой/.test(query.toLowerCase())) {
    filters.difficulty = 'easy';
  } else if (/сложн|экстрем/.test(query.toLowerCase())) {
    filters.difficulty = 'hard';
  }
  
  // Определение бюджета
  const priceMatch = query.match(/до\s+(\d+)|(\d+)\s*₽/);
  if (priceMatch) {
    filters.maxPrice = parseInt(priceMatch[1] || priceMatch[2]);
  }
  
  // Определение длительности
  const durationMatch = query.match(/(\d+)\s*дн|однодневн|день/);
  if (durationMatch) {
    filters.duration = parseInt(durationMatch[1] || '1');
  }
  
  // Определение сезона
  if (/зим|январ|феврал|декабр/.test(query.toLowerCase())) {
    filters.season = 'winter';
  } else if (/лет|июн|июл|август/.test(query.toLowerCase())) {
    filters.season = 'summer';
  }
  
  return filters;
}

/**
 * Поиск туров с AI фильтрами
 */
async function searchToursWithAI(keywords: string[], filters: any) {
  // Заглушка - в будущем будет реальный запрос к БД
  return [];
}

/**
 * Генерация AI предложений
 */
function generateSuggestions(query: string): string[] {
  const suggestions = [
    `${query} для начинающих`,
    `${query} с гидом`,
    `${query} цена`,
    `лучшие туры: ${query}`,
  ];
  
  return suggestions;
}
