import { NextRequest, NextResponse } from 'next/server';
import { ApiResponse } from '@/types';

export const dynamic = 'force-dynamic';

// GET /api/roles - Получение информации о ролях
// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function GET(request: NextRequest) {
  try {
    const roles = [
      {
        id: 'tourist',
        name: 'Турист',
        description: 'Планирование и бронирование туров, получение рекомендаций',
        permissions: [
          'view_tours',
          'book_tours',
          'view_weather',
          'use_ai_chat',
          'view_reviews',
          'manage_profile',
        ],
        features: [
          'Поиск и фильтрация туров',
          'Бронирование и оплата',
          'AI-помощник для планирования',
          'Прогноз погоды и рекомендации',
          'Отзывы и рейтинги',
          'Мобильное приложение',
        ],
        dashboard: '/hub/tourist',
      },
      {
        id: 'operator',
        name: 'Туроператор',
        description: 'Управление турами, слотами, гидами и аналитикой',
        permissions: [
          'manage_tours',
          'manage_slots',
          'manage_guides',
          'view_analytics',
          'manage_bookings',
          'manage_weather',
          'manage_transfers',
        ],
        features: [
          'CRM система для управления',
          'Создание и редактирование туров',
          'Управление расписанием и слотами',
          'Аналитика и отчеты',
          'Управление гидами',
          'Система уведомлений',
        ],
        dashboard: '/hub/operator',
        levels: [
          {
            level: 'L1',
            name: 'Базовый',
            description: 'Управление турами и слотами',
            features: ['Создание туров', 'Управление слотами', 'Базовые отчеты'],
          },
          {
            level: 'L2',
            name: 'Партнерский',
            description: 'Лиды, платежи, чаты',
            features: ['Обработка лидов', 'Платежная система', 'Чат с клиентами'],
          },
          {
            level: 'L3',
            name: 'Официальный',
            description: 'AI, мобильное приложение, API',
            features: ['AI-ассистент', 'Мобильное приложение', 'API интеграции'],
          },
        ],
      },
      {
        id: 'guide',
        name: 'Гид',
        description: 'Управление расписанием, группами и доходами',
        permissions: [
          'view_schedule',
          'manage_groups',
          'view_earnings',
          'update_availability',
          'view_weather',
          'communicate_with_tourists',
        ],
        features: [
          'Календарь туров и расписание',
          'Управление группами туристов',
          'Отслеживание доходов',
          'Планирование отпусков',
          'Связь с туристами',
          'Рейтинги и отзывы',
        ],
        dashboard: '/hub/guide',
      },
      {
        id: 'transfer',
        name: 'Владелец трансфера',
        description: 'Управление маршрутами, транспортом и водителями',
        permissions: [
          'manage_routes',
          'manage_vehicles',
          'manage_drivers',
          'manage_schedules',
          'view_analytics',
          'manage_weather',
        ],
        features: [
          'Создание и управление маршрутами',
          'Регистрация транспортных средств',
          'Управление водителями',
          'Система бронирования мест',
          'Аналитика загрузки',
          'Интеграция с турами',
        ],
        dashboard: '/hub/transfer',
      },
      {
        id: 'agent',
        name: 'Агент',
        description: 'Управление группами, ваучерами и партнерствами',
        permissions: [
          'manage_groups',
          'manage_vouchers',
          'view_commissions',
          'manage_partnerships',
          'view_analytics',
          'gds_integration',
        ],
        features: [
          'Создание групповых туров',
          'Система ваучеров',
          'Управление комиссиями',
          'GDS интеграции',
          'B2B платформы',
          'Белые метки',
        ],
        dashboard: '/hub/agent',
      },
      {
        id: 'admin',
        name: 'Администратор',
        description: 'Системное управление, мониторинг и аналитика',
        permissions: [
          'manage_users',
          'manage_roles',
          'system_monitoring',
          'weather_management',
          'inter_operator_management',
          'full_analytics',
        ],
        features: [
          'Управление пользователями и ролями',
          'Системный мониторинг',
          'Управление погодными условиями',
          'Межоператорские партнерства',
          'Полная аналитика платформы',
          'Безопасность и аудит',
        ],
        dashboard: '/hub/admin',
      },
    ];

    return NextResponse.json({
      success: true,
      data: roles,
    } as ApiResponse<any[]>);

  } catch (error) {
    console.error('Error fetching roles:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch roles',
      message: error instanceof Error ? error.message : 'Unknown error',
    } as ApiResponse<null>, { status: 500 });
  }
}

// POST /api/roles - Обновление роли пользователя
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, role, level } = body;

    if (!userId || !role) {
      return NextResponse.json({
        success: false,
        error: 'User ID and role are required',
      } as ApiResponse<null>, { status: 400 });
    }

    // Валидация роли
    const validRoles = ['tourist', 'operator', 'guide', 'transfer', 'agent', 'admin', 'stay', 'gear'];
    if (!validRoles.includes(role)) {
      return NextResponse.json({
        success: false,
        error: 'Invalid role',
      } as ApiResponse<null>, { status: 400 });
    }

    // Валидация уровня для операторов
    if (role === 'operator' && level) {
      const validLevels = ['L1', 'L2', 'L3'];
      if (!validLevels.includes(level)) {
        return NextResponse.json({
          success: false,
          error: 'Invalid operator level',
        } as ApiResponse<null>, { status: 400 });
      }
    }

    // Здесь должна быть логика обновления роли в базе данных
    // Пока возвращаем успешный ответ
    return NextResponse.json({
      success: true,
      data: {
        userId,
        role,
        level: level || null,
        message: 'Role updated successfully',
      },
    } as ApiResponse<{ userId: string; role: string; level: string | null; message: string }>);

  } catch (error) {
    console.error('Error updating role:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to update role',
      message: error instanceof Error ? error.message : 'Unknown error',
    } as ApiResponse<null>, { status: 500 });
  }
}