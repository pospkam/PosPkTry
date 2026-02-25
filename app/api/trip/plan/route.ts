/**
 * API Endpoint: Планирование поездки на Камчатку
 * 
 * Функциональность:
 * - Анализ запроса пользователя (AI)
 * - Подбор туров из БД
 * - Подбор размещения из БД
 * - Подбор трансферов из БД
 * - Генерация детального маршрута с логистикой
 * - Расчет общей стоимости
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60 секунд для сложных запросов

// Типы
interface TripRequest {
  query: string; // Запрос пользователя
  days: number; // Количество дней
  budget?: number; // Бюджет (опционально)
  interests?: string[]; // Интересы: ['hiking', 'wildlife', 'culture', 'adventure', 'relaxation']
  groupSize?: number; // Размер группы
  startDate?: string; // Дата начала (YYYY-MM-DD)
}

interface TourCard {
  id: string;
  name: string;
  description: string;
  duration: number; // часы
  price: number;
  difficulty: string;
  operator_id: string;
  rating: number;
  coordinates: any[];
}

interface AccommodationCard {
  id: string;
  name: string;
  type: string;
  address: string;
  price_per_night: number;
  rating: number;
  amenities: string[];
  coordinates: { lat: number; lng: number };
}

interface TransferCard {
  id: string;
  route_name: string;
  from_location: string;
  to_location: string;
  distance_km: number;
  duration_minutes: number;
  price_per_person: number;
  vehicle_type: string;
}

interface DayPlan {
  day: number;
  date?: string;
  activities: {
    time: string;
    type: 'tour' | 'transfer' | 'accommodation' | 'free_time' | 'meal';
    card_id?: string;
    title: string;
    description: string;
    duration?: number;
    price?: number;
    logistics?: {
      transport: 'walk' | 'car' | 'bus' | 'taxi' | 'transfer';
      duration_minutes: number;
      distance_km?: number;
      notes?: string;
    };
  }[];
  accommodation?: AccommodationCard;
  total_cost: number;
}

interface TripPlan {
  summary: {
    total_days: number;
    total_cost: number;
    highlights: string[];
    difficulty_level: 'easy' | 'medium' | 'hard' | 'mixed';
  };
  days: DayPlan[];
  tours: TourCard[];
  accommodations: AccommodationCard[];
  transfers: TransferCard[];
  recommendations: string[];
  important_notes: string[];
}

/**
 * POST /api/trip/plan
 * Планирование поездки на Камчатку
 *
 * AUTH: Public — trip planning for visitors before booking
 */
export async function POST(request: NextRequest) {
  try {
    const body: TripRequest = await request.json();
    
    if (!body.query || !body.days || body.days < 1 || body.days > 30) {
      return NextResponse.json({
        success: false,
        error: 'Invalid request. Please provide query and days (1-30).',
      }, { status: 400 });
    }

    console.log('  Планирование поездки:', { query: body.query, days: body.days });

    // Шаг 1: Анализ запроса через AI
    const userIntent = await analyzeUserIntent(body.query, body);

    // Шаг 2: Подбор туров из БД
    const tours = await selectTours(userIntent, body.days, body.budget);

    // Шаг 3: Подбор размещения из БД
    const accommodations = await selectAccommodations(body.days, body.budget, body.groupSize);

    // Шаг 4: Подбор трансферов из БД
    const transfers = await selectTransfers(tours, accommodations);

    // Шаг 5: Генерация детального маршрута через AI
    const tripPlan = await generateTripPlan(
      body,
      userIntent,
      tours,
      accommodations,
      transfers
    );

    return NextResponse.json({
      success: true,
      data: tripPlan,
    });

  } catch (error) {
    console.error('[✗] Ошибка планирования поездки:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to plan trip',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

/**
 * Анализ намерений пользователя через AI
 */
async function analyzeUserIntent(query: string, request: TripRequest): Promise<any> {
  const systemPrompt = `Ты - эксперт по туризму на Камчатке. Проанализируй запрос пользователя и извлеки:
1. Основные интересы (вулканы, медведи, рыбалка, термальные источники, культура, активный отдых)
2. Уровень физической подготовки (легкий, средний, сложный)
3. Тип путешественника (одиночка, пара, семья, группа)
4. Приоритеты (приключения, комфорт, бюджет, экология, фотография)

Верни JSON:
{
  "interests": ["hiking", "wildlife", "photography"],
  "difficulty": "medium",
  "traveler_type": "couple",
  "priorities": ["adventure", "nature"],
  "must_see": ["Ключевская сопка", "Долина гейзеров"],
  "avoid": ["crowds"]
}`;

  const aiResponse = await callAI(systemPrompt, `Запрос: ${query}\nДней: ${request.days}`);
  
  try {
    return JSON.parse(aiResponse);
  } catch {
    // Fallback если AI вернул не JSON
    return {
      interests: request.interests || ['nature', 'adventure'],
      difficulty: 'medium',
      traveler_type: 'group',
      priorities: ['adventure'],
      must_see: [],
      avoid: []
    };
  }
}

/**
 * Подбор туров из БД
 */
async function selectTours(
  userIntent: any,
  days: number,
  budget?: number
): Promise<TourCard[]> {
  try {
    // Определяем сложность туров
    const difficultyMap: Record<string, string[]> = {
      'easy': ['easy'],
      'medium': ['easy', 'medium'],
      'hard': ['easy', 'medium', 'hard']
    };
    
    const allowedDifficulty = difficultyMap[userIntent.difficulty] || ['easy', 'medium'];
    
    // Максимальное количество часов на туры (80% времени)
    const totalHoursAvailable = days * 24 * 0.8;
    
    const sql = `
      SELECT 
        id,
        name,
        short_description as description,
        duration,
        price,
        difficulty,
        operator_id,
        rating,
        coordinates,
        season
      FROM tours
      WHERE 
        is_active = true
        AND difficulty = ANY($1)
        ${budget ? 'AND price <= $2' : ''}
        AND rating >= 3.5
      ORDER BY 
        rating DESC,
        review_count DESC
      LIMIT 15
    `;
    
    const params = budget ? [allowedDifficulty, budget * 0.3] : [allowedDifficulty];
    const result = await query(sql, params);
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      description: row.description || '',
      duration: row.duration,
      price: parseFloat(row.price),
      difficulty: row.difficulty,
      operator_id: row.operator_id,
      rating: parseFloat(row.rating),
      coordinates: row.coordinates || []
    }));
    
  } catch (error) {
    console.error('Ошибка подбора туров:', error);
    return [];
  }
}

/**
 * Подбор размещения из БД
 */
async function selectAccommodations(
  days: number,
  budget?: number,
  groupSize: number = 2
): Promise<AccommodationCard[]> {
  try {
    const sql = `
      SELECT 
        a.id,
        a.name,
        a.type,
        a.address,
        a.price_per_night_from as price_per_night,
        a.rating,
        a.amenities,
        a.coordinates
      FROM accommodations a
      WHERE 
        a.is_active = true
        ${budget ? 'AND a.price_per_night_from <= $1' : ''}
        AND a.rating >= 3.5
      ORDER BY 
        a.rating DESC,
        a.price_per_night_from ASC
      LIMIT 10
    `;
    
    const params = budget ? [budget / days] : [];
    const result = await query(sql, params);
    
    return result.rows.map(row => ({
      id: row.id,
      name: row.name,
      type: row.type,
      address: row.address,
      price_per_night: parseFloat(row.price_per_night),
      rating: parseFloat(row.rating),
      amenities: row.amenities || [],
      coordinates: row.coordinates || { lat: 53.0, lng: 158.6 }
    }));
    
  } catch (error) {
    console.error('Ошибка подбора размещения:', error);
    return [];
  }
}

/**
 * Подбор трансферов из БД
 */
async function selectTransfers(
  tours: TourCard[],
  accommodations: AccommodationCard[]
): Promise<TransferCard[]> {
  try {
    const sql = `
      SELECT 
        tr.id,
        tr.name as route_name,
        tr.from_location,
        tr.to_location,
        tr.distance_km,
        tr.estimated_duration_minutes as duration_minutes,
        ts.price_per_person,
        tv.vehicle_type
      FROM transfer_routes tr
      LEFT JOIN transfer_schedules ts ON tr.id = ts.route_id
      LEFT JOIN transfer_vehicles tv ON ts.vehicle_id = tv.id
      WHERE 
        tr.is_active = true
        AND ts.is_active = true
      ORDER BY 
        tr.distance_km ASC
      LIMIT 20
    `;
    
    const result = await query(sql, []);
    
    return result.rows.map(row => ({
      id: row.id,
      route_name: row.route_name,
      from_location: row.from_location,
      to_location: row.to_location,
      distance_km: parseFloat(row.distance_km) || 0,
      duration_minutes: row.duration_minutes || 60,
      price_per_person: parseFloat(row.price_per_person) || 0,
      vehicle_type: row.vehicle_type || 'comfort'
    }));
    
  } catch (error) {
    console.error('Ошибка подбора трансферов:', error);
    return [];
  }
}

/**
 * Генерация детального плана поездки через AI
 */
async function generateTripPlan(
  request: TripRequest,
  userIntent: any,
  tours: TourCard[],
  accommodations: AccommodationCard[],
  transfers: TransferCard[]
): Promise<TripPlan> {
  
  const systemPrompt = `Ты - эксперт планировщик поездок на Камчатку. 

У тебя есть:
- ${tours.length} доступных туров
- ${accommodations.length} вариантов размещения
- ${transfers.length} трансферов

Создай ДЕТАЛЬНЫЙ план на ${request.days} дней. Для КАЖДОГО дня включи:
1. Утро (9:00-12:00): активности, туры
2. День (12:00-17:00): основные активности
3. Вечер (17:00-21:00): отдых, ужин
4. Логистику между точками (пешком/транспорт/такси, время, расстояние)
5. Размещение на ночь

ОБЯЗАТЕЛЬНО:
- Укажи ID тура из списка: ${tours.map(t => `${t.id}:${t.name}`).join(', ')}
- Укажи ID размещения: ${accommodations.map(a => `${a.id}:${a.name}`).join(', ')}
- Рассчитай логистику между точками
- Дай время на отдых и переезды
- Учитывай погоду Камчатки

Верни строго JSON:
{
  "summary": {
    "total_days": ${request.days},
    "total_cost": 0,
    "highlights": ["топ-3 момента путешествия"],
    "difficulty_level": "medium"
  },
  "days": [
    {
      "day": 1,
      "activities": [
        {
          "time": "09:00",
          "type": "transfer",
          "card_id": "transfer-id",
          "title": "Трансфер из аэропорта",
          "description": "...",
          "duration": 60,
          "price": 1500,
          "logistics": {
            "transport": "car",
            "duration_minutes": 60,
            "distance_km": 30,
            "notes": "Встреча с водителем"
          }
        },
        {
          "time": "14:00",
          "type": "tour",
          "card_id": "tour-id-from-list",
          "title": "Название тура из БД",
          "description": "...",
          "duration": 180,
          "price": 5000
        }
      ],
      "accommodation": {"id": "acc-id-from-list"},
      "total_cost": 8500
    }
  ],
  "recommendations": ["практические советы"],
  "important_notes": ["важная информация о безопасности"]
}`;

  const userPrompt = `
Запрос пользователя: ${request.query}
Дни: ${request.days}
Бюджет: ${request.budget || 'не указан'}
Интересы: ${JSON.stringify(userIntent.interests)}

ДОСТУПНЫЕ ТУРЫ:
${tours.map(t => `- ${t.id}: ${t.name} (${t.duration}ч, ${t.price}₽, ${t.difficulty})`).join('\n')}

ДОСТУПНОЕ РАЗМЕЩЕНИЕ:
${accommodations.map(a => `- ${a.id}: ${a.name} (${a.price_per_night}₽/ночь, ${a.type})`).join('\n')}

ДОСТУПНЫЕ ТРАНСФЕРЫ:
${transfers.slice(0, 5).map(t => `- ${t.route_name}: ${t.from_location} → ${t.to_location} (${t.duration_minutes}мин, ${t.price_per_person}₽)`).join('\n')}
`;

  const aiResponse = await callAI(systemPrompt, userPrompt);
  
  try {
    const plan = JSON.parse(aiResponse);
    
    // Обогащаем план полными данными карточек
    plan.tours = tours.filter(t => 
      plan.days.some((d: DayPlan) => 
        d.activities.some(a => a.card_id === t.id)
      )
    );
    
    plan.accommodations = accommodations.filter(a =>
      plan.days.some((d: DayPlan) => d.accommodation?.id === a.id)
    );
    
    plan.transfers = transfers.filter(t =>
      plan.days.some((d: DayPlan) =>
        d.activities.some(a => a.card_id === t.id)
      )
    );
    
    return plan;
    
  } catch (error) {
    console.error('Ошибка парсинга плана:', error);
    
    // Fallback: создаем базовый план
    return createFallbackPlan(request, tours, accommodations);
  }
}

/**
 * Fallback план если AI не смог сгенерировать
 */
function createFallbackPlan(
  request: TripRequest,
  tours: TourCard[],
  accommodations: AccommodationCard[]
): TripPlan {
  
  const days: DayPlan[] = [];
  let totalCost = 0;
  
  for (let day = 1; day <= request.days; day++) {
    const dayTours = tours.slice(0, 1); // Берем 1 тур в день
    const accommodation = accommodations[0];
    
    const activities = dayTours.map((tour, idx) => ({
      time: idx === 0 ? '10:00' : '14:00',
      type: 'tour' as const,
      card_id: tour.id,
      title: tour.name,
      description: tour.description,
      duration: tour.duration,
      price: tour.price,
      logistics: {
        transport: 'car' as const,
        duration_minutes: 30,
        distance_km: 15,
        notes: 'Трансфер к месту начала тура'
      }
    }));
    
    const dayCost = dayTours.reduce((sum, t) => sum + t.price, 0) + 
                    (accommodation?.price_per_night || 0);
    
    totalCost += dayCost;
    
    days.push({
      day,
      activities,
      accommodation,
      total_cost: dayCost
    });
  }
  
  return {
    summary: {
      total_days: request.days,
      total_cost: totalCost,
      highlights: [
        'Знакомство с вулканами Камчатки',
        'Посещение природных достопримечательностей',
        'Комфортное размещение'
      ],
      difficulty_level: 'medium'
    },
    days,
    tours,
    accommodations: accommodations.slice(0, 1),
    transfers: [],
    recommendations: [
      'Возьмите теплую одежду - погода изменчива',
      'Носите удобную обувь для походов',
      'Не забудьте фотоаппарат!'
    ],
    important_notes: [
      'Соблюдайте правила безопасности в медвежьих зонах',
      'Предупреждайте гида о проблемах со здоровьем',
      'Оформите страховку для активного отдыха'
    ]
  };
}

/**
 * Вызов AI (GROQ или DeepSeek)
 */
async function callAI(systemPrompt: string, userPrompt: string): Promise<string> {
  // Пробуем GROQ
  if (config.ai.groq.apiKey) {
    try {
      const response = await fetch(`${config.ai.groq.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.ai.groq.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.ai.groq.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: config.ai.groq.maxTokens,
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices[0].message.content;
      }
    } catch (error) {
      console.error('GROQ AI error:', error);
    }
  }

  // Пробуем DeepSeek
  if (config.ai.deepseek.apiKey) {
    try {
      const response = await fetch(`${config.ai.deepseek.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.ai.deepseek.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: config.ai.deepseek.model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          max_tokens: config.ai.deepseek.maxTokens,
          temperature: 0.7,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        return data.choices[0].message.content;
      }
    } catch (error) {
      console.error('DeepSeek AI error:', error);
    }
  }

  throw new Error('All AI providers unavailable');
}
