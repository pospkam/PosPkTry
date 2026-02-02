import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { ChatMessage, ChatSession, ApiResponse } from '@/types';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';

// GET /api/chat - Получение истории чата
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const userId = searchParams.get('userId');

    if (!sessionId && !userId) {
      return NextResponse.json({
        success: false,
        error: 'Session ID or User ID is required',
      } as ApiResponse<null>, { status: 400 });
    }

    let chatQuery: string;
    let queryParams: any[];

    if (sessionId) {
      // Получаем чат по sessionId
      chatQuery = `
        SELECT 
          s.id as session_id,
          s.user_id,
          s.context,
          s.created_at as session_created_at,
          s.updated_at as session_updated_at,
          m.id as message_id,
          m.role,
          m.content,
          m.timestamp,
          m.metadata
        FROM chat_sessions s
        LEFT JOIN chat_messages m ON s.id = m.session_id
        WHERE s.id = $1
        ORDER BY m.timestamp ASC
      `;
      queryParams = [sessionId];
    } else {
      // Получаем последний чат пользователя
      chatQuery = `
        SELECT 
          s.id as session_id,
          s.user_id,
          s.context,
          s.created_at as session_created_at,
          s.updated_at as session_updated_at,
          m.id as message_id,
          m.role,
          m.content,
          m.timestamp,
          m.metadata
        FROM chat_sessions s
        LEFT JOIN chat_messages m ON s.id = m.session_id
        WHERE s.user_id = $1
        ORDER BY s.updated_at DESC, m.timestamp ASC
        LIMIT 1
      `;
      queryParams = [userId];
    }

    const result = await query(chatQuery, queryParams);

    if (result.rows.length === 0) {
      return NextResponse.json({
        success: true,
        data: null,
      } as ApiResponse<ChatSession | null>);
    }

    // Группируем сообщения по сессиям
    const sessionsMap = new Map<string, ChatSession>();
    
    for (const row of result.rows) {
      if (!sessionsMap.has(row.session_id)) {
        sessionsMap.set(row.session_id, {
          id: row.session_id,
          userId: row.user_id,
          messages: [],
          context: row.context || {},
          createdAt: new Date(row.session_created_at),
          updatedAt: new Date(row.session_updated_at),
        });
      }

      if (row.message_id) {
        const session = sessionsMap.get(row.session_id)!;
        session.messages.push({
          id: row.message_id,
          role: row.role,
          content: row.content,
          timestamp: new Date(row.timestamp),
          metadata: row.metadata || {},
        });
      }
    }

    const sessions = Array.from(sessionsMap.values());
    const session = sessions[0]; // Берем первую (или единственную) сессию

    return NextResponse.json({
      success: true,
      data: session,
    } as ApiResponse<ChatSession>);

  } catch (error) {
    console.error('Error fetching chat:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch chat',
      message: error instanceof Error ? error.message : 'Unknown error',
    } as ApiResponse<null>, { status: 500 });
  }
}

// POST /api/chat - Отправка сообщения в чат
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { sessionId, userId, message, context } = body;

    if (!message || (!sessionId && !userId)) {
      return NextResponse.json({
        success: false,
        error: 'Message and sessionId or userId are required',
      } as ApiResponse<null>, { status: 400 });
    }

    let currentSessionId = sessionId;

    // Если sessionId не указан, создаем новую сессию
    if (!currentSessionId) {
      const createSessionQuery = `
        INSERT INTO chat_sessions (user_id, context, created_at, updated_at)
        VALUES ($1, $2, NOW(), NOW())
        RETURNING id
      `;
      
      const sessionResult = await query(createSessionQuery, [userId, JSON.stringify(context || {})]);
      currentSessionId = sessionResult.rows[0].id;
    }

    // Сохраняем сообщение пользователя
    const saveMessageQuery = `
      INSERT INTO chat_messages (session_id, role, content, timestamp, metadata)
      VALUES ($1, $2, $3, NOW(), $4)
      RETURNING id, timestamp
    `;

    const messageResult = await query(saveMessageQuery, [
      currentSessionId,
      'user',
      message,
      JSON.stringify({})
    ]);

    const userMessage: ChatMessage = {
      id: messageResult.rows[0].id,
      role: 'user',
      content: message,
      timestamp: new Date(messageResult.rows[0].timestamp),
      metadata: {},
    };

    // Получаем ответ от AI
    const aiResponse = await getAIResponse(message, context);

    // Сохраняем ответ AI
    const aiMessageResult = await query(saveMessageQuery, [
      currentSessionId,
      'assistant',
      aiResponse.content,
      JSON.stringify(aiResponse.metadata || {})
    ]);

    const aiMessage: ChatMessage = {
      id: aiMessageResult.rows[0].id,
      role: 'assistant',
      content: aiResponse.content,
      timestamp: new Date(aiMessageResult.rows[0].timestamp),
      metadata: aiResponse.metadata || {},
    };

    // Обновляем время последнего обновления сессии
    await query(
      'UPDATE chat_sessions SET updated_at = NOW() WHERE id = $1',
      [currentSessionId]
    );

    return NextResponse.json({
      success: true,
      data: {
        sessionId: currentSessionId,
        messages: [userMessage, aiMessage],
      },
    } as ApiResponse<{ sessionId: string; messages: ChatMessage[] }>);

  } catch (error) {
    console.error('Error sending chat message:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to send chat message',
      message: error instanceof Error ? error.message : 'Unknown error',
    } as ApiResponse<null>, { status: 500 });
  }
}

// Функция для получения ответа от AI
async function getAIResponse(message: string, context?: any): Promise<{ content: string; metadata?: any }> {
  try {
    // Формируем промпт с контекстом Камчатки
    const systemPrompt = `Ты - AI-гид по Камчатке. Твоя задача - помогать туристам планировать путешествия, отвечать на вопросы о достопримечательностях, погоде, безопасности и местных особенностях.

Контекст:
- Ты находишься в Камчатском крае, России
- Основные достопримечательности: вулканы, гейзеры, медведи, рыбалка, термальные источники
- Сезонность: лето (июнь-сентябрь) - лучшее время для туризма
- Безопасность: важно соблюдать правила в медвежьих зонах
- Погода: переменчивая, нужно быть готовым к любым условиям

Отвечай кратко, информативно и дружелюбно. Если не знаешь ответа, честно скажи об этом.`;

    const userPrompt = `Пользователь: ${message}`;

    // Пробуем получить ответ от GROQ
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
            temperature: config.ai.groq.temperature,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return {
            content: data.choices[0].message.content,
            metadata: {
              model: config.ai.groq.model,
              provider: 'groq',
              tokens: data.usage?.total_tokens,
            }
          };
        }
      } catch (error) {
        console.error('GROQ API error:', error);
      }
    }

    // Если GROQ не работает, пробуем DeepSeek
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
            temperature: config.ai.deepseek.temperature,
          }),
        });

        if (response.ok) {
          const data = await response.json();
          return {
            content: data.choices[0].message.content,
            metadata: {
              model: config.ai.deepseek.model,
              provider: 'deepseek',
              tokens: data.usage?.total_tokens,
            }
          };
        }
      } catch (error) {
        console.error('DeepSeek API error:', error);
      }
    }

    // Если все AI провайдеры не работают, возвращаем стандартный ответ
    return {
      content: "Извините, я временно недоступен. Попробуйте позже или обратитесь к нашим специалистам по телефону +7 (4152) 123-456.",
      metadata: {
        provider: 'fallback',
        error: 'All AI providers unavailable'
      }
    };

  } catch (error) {
    console.error('Error getting AI response:', error);
    return {
      content: "Произошла ошибка при обработке вашего запроса. Попробуйте еще раз.",
      metadata: {
        provider: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }
}