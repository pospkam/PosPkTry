import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // TODO: Получить список трансфертов
    return NextResponse.json(
      { success: true, transfers: [] },
      { status: 200 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Ошибка получения трансфертов' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { from, to, date, passengers } = await request.json();
    
    // TODO: Создать новый трансферт
    return NextResponse.json(
      { success: true, message: 'Трансферт создан' },
      { status: 201 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: 'Ошибка создания трансферта' },
      { status: 500 }
    );
  }
}

