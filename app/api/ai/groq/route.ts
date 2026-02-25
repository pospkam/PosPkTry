import { NextRequest, NextResponse } from 'next/server';
import { config } from '@/lib/config';

export const dynamic = 'force-dynamic';

// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt } = body;

    if (!prompt) {
      return NextResponse.json({
        success: false,
        error: 'Prompt is required',
      }, { status: 400 });
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${config.ai.groq.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          {
            role: 'system',
            content: 'Ты AI-гид по Камчатке. Отвечай на русском языке, будь дружелюбным и полезным. Помогай с планированием туров, рассказывай о достопримечательностях, давай советы по безопасности и погоде.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 1000,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API error: ${response.status}`);
    }

    const data = await response.json();
    const answer = data.choices[0]?.message?.content || 'Извините, не могу ответить на этот вопрос.';

    return NextResponse.json({
      success: true,
      data: {
        answer,
        model: 'llama3-8b-8192',
        usage: data.usage,
      },
    });

  } catch (error) {
    console.error('Error calling Groq API:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get AI response',
      message: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}