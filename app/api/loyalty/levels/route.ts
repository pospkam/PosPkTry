import { NextRequest, NextResponse } from 'next/server';
import { loyaltySystem } from '@/lib/loyalty/loyalty-system';

export const dynamic = 'force-dynamic';

// GET /api/loyalty/levels - Получение всех уровней лояльности
// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function GET(request: NextRequest) {
  try {
    const levels = loyaltySystem.getAllLevels();

    return NextResponse.json({
      success: true,
      data: levels
    });

  } catch (error) {
    console.error('Loyalty levels error:', error);
    return NextResponse.json({
      success: false,
      error: 'Ошибка получения уровней лояльности'
    }, { status: 500 });
  }
}