import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();
    
    // TODO: Добавить аутентификацию пользователя
    return NextResponse.json(
      { success: true, message: 'Вход успешен', token: 'jwt_token' },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Ошибка входа' },
      { status: 500 }
    );
  }
}

