import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, role } = await request.json();
    
    // TODO: Добавить регистрацию пользователя
    return NextResponse.json(
      { success: true, message: 'Регистрация успешна' },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Ошибка регистрации' },
      { status: 500 }
    );
  }
}

