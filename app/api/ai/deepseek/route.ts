import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

export const runtime = 'edge';

const deepseekLimiter = createRateLimiter({ windowMs: 60_000, max: 10 });

interface DeepSeekMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface DeepSeekRequest {
  model: string;
  messages: DeepSeekMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
}

const DeepSeekChatSchema = z.object({
  message: z.string().min(1, 'Сообщение обязательно'),
  context: z.string().optional(),
});

// POST /api/ai/deepseek - Chat с DeepSeek AI
// AUTH: Public — AI assistant for visitors
export async function POST(request: NextRequest) {
  const ip = getClientIp(request.headers);
  if (!deepseekLimiter.check(ip)) {
    return NextResponse.json(
      { error: 'Слишком много запросов. Попробуйте позже.' },
      { status: 429 }
    );
  }
  try {
    const body = await request.json();
    const parsed = DeepSeekChatSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0]?.message || 'Некорректные данные' },
        { status: 400 }
      );
    }
    const { message, context } = parsed.data;

    // DeepSeek API Key (добавьте в .env)
    const apiKey = process.env.DEEPSEEK_API_KEY || '';

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'DeepSeek API key not configured',
      }, { status: 500 });
    }

    // Системный промпт для AI.Kam
    const systemPrompt = `Ты AI.Kam - умный помощник по Камчатке. 

Твоя роль:
- Помогать туристам узнать о Камчатке
- Рекомендовать туры, достопримечательности, активности
- Давать советы по безопасности и подготовке
- Отвечать на вопросы о погоде, транспорте, размещении
- Быть дружелюбным и информативным

Информация о Камчатке:
- Вулканы: Авачинский (2741м), Корякский (3456м), Мутновский, Толбачик
- Долина гейзеров - уникальное место с 90+ гейзерами
- Курильское озеро - место нереста лосося и обитания медведей
- Халактырский пляж - черный вулканический песок
- Лучшее время: июль-сентябрь
- Рыбалка: лосось, кижуч, чавыча, голец
- Горячие источники: Паратунка, Верхне-Паратунские

Отвечай кратко, по-русски, с эмодзи для наглядности.`;

    const messages: DeepSeekMessage[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: message }
    ];

    // Запрос к DeepSeek API
    const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages,
        temperature: 0.7,
        max_tokens: 500,
        stream: false,
      } as DeepSeekRequest),
    });

    if (!response.ok) {
      const errorData = await response.text();
      
      return NextResponse.json({
        success: false,
        error: 'Failed to get response from AI',
        details: errorData,
      }, { status: response.status });
    }

    const data = await response.json();
    
    const aiMessage = data.choices[0]?.message?.content || 'Извините, не смог обработать запрос.';

    return NextResponse.json({
      success: true,
      data: {
        message: aiMessage,
        model: data.model,
        usage: data.usage,
      },
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// GET /api/ai/deepseek/status - Проверка статуса API
export async function GET(request: NextRequest) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  
  return NextResponse.json({
    success: true,
    data: {
      configured: !!apiKey,
      model: 'deepseek-chat',
      endpoint: 'https://api.deepseek.com/v1/chat/completions',
    },
  });
}
