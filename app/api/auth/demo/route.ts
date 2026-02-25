import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function POST(request: NextRequest) {
  try {
    const { role } = await request.json();

    const demoUser = {
      id: 'demo_user_123',
      email: 'pospk@mail.ru',
      name: 'Демо Пользователь',
      avatar: '/api/placeholder/64/64',
      roles: [role || 'tourist'],
      preferences: {
        language: 'ru',
        notifications: true,
        emergencyAlerts: true,
        locationSharing: false,
        theme: 'system'
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDemo: true
    };

    return NextResponse.json(demoUser);
  } catch (error) {
    console.error('Demo user creation error:', error);
    return NextResponse.json(
      { error: 'Внутренняя ошибка сервера' },
      { status: 500 }
    );
  }
}