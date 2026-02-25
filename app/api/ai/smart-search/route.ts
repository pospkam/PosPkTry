import { NextResponse } from 'next/server';
import { FISHING_TOURS } from '@/lib/partners/kamchatka-fishing/tours-data';

/**
 * AI Smart Search API
 * Умный поиск туров с AI анализом запроса
 *
 * AUTH: Public — AI search for visitors
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

    const normalizedQuery = query.toLowerCase().trim();
    
    const analysis = analyzeQuery(normalizedQuery);
    const results = searchTours(normalizedQuery, analysis);
    const recommendations = generateRecommendations(normalizedQuery, results);

    return NextResponse.json({
      success: true,
      query,
      analysis,
      results: results.slice(0, 10),
      totalFound: results.length,
      recommendations,
    });
  } catch (error) {
    console.error('AI Smart Search error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

interface QueryAnalysis {
  intent: 'search' | 'price' | 'date' | 'info';
  fishTypes: string[];
  season: 'winter' | 'summer' | 'autumn' | 'spring' | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  tourType: 'daily' | 'multi' | 'family' | null;
  maxPrice: number | null;
  duration: number | null;
  keywords: string[];
}

function analyzeQuery(query: string): QueryAnalysis {
  const analysis: QueryAnalysis = {
    intent: 'search',
    fishTypes: [],
    season: null,
    difficulty: null,
    tourType: null,
    maxPrice: null,
    duration: null,
    keywords: [],
  };

  if (/сколько|цена|стоимость|стоит/.test(query)) {
    analysis.intent = 'price';
  } else if (/когда|дата|сезон|месяц/.test(query)) {
    analysis.intent = 'date';
  } else if (/что включено|как добраться|что взять/.test(query)) {
    analysis.intent = 'info';
  }

  const fishPatterns: Record<string, string> = {
    'чавыч': 'Чавыча',
    'кижуч': 'Кижуч',
    'нерк': 'Нерка',
    'горбуш': 'Горбуша',
    'голец': 'Голец',
    'микиж': 'Микижа',
    'форел': 'Микижа',
    'хариус': 'Хариус',
    'кунж': 'Кунжа',
    'лосос': 'Чавыча',
  };

  for (const [pattern, fish] of Object.entries(fishPatterns)) {
    if (query.includes(pattern)) {
      analysis.fishTypes.push(fish);
    }
  }

  if (/зим|январ|феврал|декабр|подлед|лёд|снег/.test(query)) {
    analysis.season = 'winter';
  } else if (/лет|июн|июл|август/.test(query)) {
    analysis.season = 'summer';
  } else if (/осен|сентябр|октябр|ноябр/.test(query)) {
    analysis.season = 'autumn';
  } else if (/весн|март|апрел|май/.test(query)) {
    analysis.season = 'spring';
  }

  if (/начинающ|новичк|легк|простой|первый раз/.test(query)) {
    analysis.difficulty = 'easy';
  } else if (/сложн|экстрем|опытн|профессионал/.test(query)) {
    analysis.difficulty = 'hard';
  }

  if (/семь|дет|ребен/.test(query)) {
    analysis.tourType = 'family';
  } else if (/многодневн|недел|несколько дней/.test(query)) {
    analysis.tourType = 'multi';
  } else if (/однодневн|один день|на день/.test(query)) {
    analysis.tourType = 'daily';
  }

  const priceMatch = query.match(/до\s*(\d+)|(\d+)\s*₽|(\d+)\s*руб|бюджет\s*(\d+)/);
  if (priceMatch) {
    const price = parseInt(priceMatch[1] || priceMatch[2] || priceMatch[3] || priceMatch[4]);
    if (price > 0) {
      analysis.maxPrice = price < 1000 ? price * 1000 : price;
    }
  }

  const durationMatch = query.match(/(\d+)\s*дн|(\d+)\s*суток/);
  if (durationMatch) {
    analysis.duration = parseInt(durationMatch[1] || durationMatch[2]);
  }

  const stopWords = ['на', 'в', 'и', 'с', 'по', 'для', 'как', 'что', 'где', 'когда', 'сколько', 'хочу', 'нужен', 'ищу', 'рыбалка', 'тур', 'камчатка'];
  analysis.keywords = query
    .split(/\s+/)
    .filter(word => word.length > 2 && !stopWords.includes(word));

  return analysis;
}

function searchTours(query: string, analysis: QueryAnalysis) {
  let results = [...FISHING_TOURS];

  if (analysis.fishTypes.length > 0) {
    results = results.filter(tour =>
      analysis.fishTypes.some(fish =>
        tour.fishTypes.some(tf => tf.toLowerCase().includes(fish.toLowerCase()))
      )
    );
  }

  if (analysis.season) {
    const seasonMonths: Record<string, number[]> = {
      winter: [12, 1, 2, 3],
      spring: [3, 4, 5],
      summer: [6, 7, 8],
      autumn: [9, 10, 11],
    };
    const months = seasonMonths[analysis.season];
    results = results.filter(tour => {
      const startMonth = parseInt(tour.season.start.split('-')[0]);
      const endMonth = parseInt(tour.season.end.split('-')[0]);
      return months.some(m => {
        if (startMonth <= endMonth) {
          return m >= startMonth && m <= endMonth;
        }
        return m >= startMonth || m <= endMonth;
      });
    });
  }

  if (analysis.difficulty) {
    results = results.filter(tour => tour.difficulty === analysis.difficulty);
  }

  if (analysis.tourType) {
    results = results.filter(tour => tour.type === analysis.tourType);
  }

  if (analysis.maxPrice) {
    results = results.filter(tour => tour.price <= analysis.maxPrice!);
  }

  if (analysis.duration) {
    results = results.filter(tour => tour.duration === analysis.duration);
  }

  results.sort((a, b) => {
    let scoreA = 0;
    let scoreB = 0;

    scoreA += (a.rating || 0) * 10;
    scoreB += (b.rating || 0) * 10;

    for (const keyword of analysis.keywords) {
      if (a.name.toLowerCase().includes(keyword)) scoreA += 5;
      if (b.name.toLowerCase().includes(keyword)) scoreB += 5;
    }

    if (a.priceOld) scoreA += 3;
    if (b.priceOld) scoreB += 3;

    return scoreB - scoreA;
  });

  return results;
}

function generateRecommendations(query: string, results: typeof FISHING_TOURS) {
  const recommendations: string[] = [];

  if (results.length === 0) {
    recommendations.push('Попробуйте расширить критерии поиска');
    recommendations.push('Посмотрите все доступные туры');
  } else if (results.length > 5) {
    recommendations.push('Уточните вид рыбы для более точного поиска');
    recommendations.push('Укажите желаемый бюджет');
  }

  const now = new Date();
  const month = now.getMonth() + 1;
  
  if (month >= 6 && month <= 7) {
    recommendations.push('Сейчас сезон чавычи — лучшее время для трофейной рыбалки!');
  } else if (month >= 8 && month <= 10) {
    recommendations.push('Сезон кижуча — отличное время для рыбалки');
  } else if (month >= 11 || month <= 3) {
    recommendations.push('Зимняя рыбалка на гольца и микижу — уникальный опыт!');
  }

  const popularTour = results.find(t => (t.reviewsCount || 0) > 30);
  if (popularTour) {
    recommendations.push(`Популярный выбор: "${popularTour.name}"`);
  }

  return recommendations.slice(0, 3);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q') || '';

  if (!query) {
    return NextResponse.json({
      success: true,
      results: FISHING_TOURS.slice(0, 6),
      totalFound: FISHING_TOURS.length,
    });
  }

  const analysis = analyzeQuery(query.toLowerCase());
  const results = searchTours(query.toLowerCase(), analysis);

  return NextResponse.json({
    success: true,
    query,
    results: results.slice(0, 10),
    totalFound: results.length,
  });
}
