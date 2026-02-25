import { NextRequest, NextResponse } from 'next/server';
import { 
  KamchatkaFishingClient,
  syncTours,
  getSyncStatus 
} from '@/lib/partners/kamchatka-fishing';

export const dynamic = 'force-dynamic';

// GET /api/partners/kamchatka-fishing - Статус интеграции
// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function GET(request: NextRequest) {
  try {
    const status = await getSyncStatus();
    
    return NextResponse.json({
      success: true,
      data: {
        partner: {
          id: 'kamchatka-fishing',
          name: 'Камчатская Рыбалка',
          website: 'https://fishingkam.ru',
          type: 'fishing-tours',
        },
        sync: status,
        configured: !!(
          process.env.KAMCHATKA_FISHING_API_KEY && 
          process.env.KAMCHATKA_FISHING_API_SECRET
        ),
      },
    });
  } catch (error) {
    console.error('Error getting partner status:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to get partner status',
    }, { status: 500 });
  }
}

// POST /api/partners/kamchatka-fishing - Запустить синхронизацию
export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.KAMCHATKA_FISHING_API_KEY;
    const apiSecret = process.env.KAMCHATKA_FISHING_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json({
        success: false,
        error: 'API credentials not configured',
      }, { status: 400 });
    }

    const client = new KamchatkaFishingClient({
      apiKey,
      apiSecret,
    });

    // Проверяем подключение
    try {
      await client.healthCheck();
    } catch (healthError) {
      return NextResponse.json({
        success: false,
        error: 'Cannot connect to partner API',
        details: healthError instanceof Error ? healthError.message : 'Unknown error',
      }, { status: 502 });
    }

    // Запускаем синхронизацию
    const result = await syncTours(client);

    return NextResponse.json({
      success: result.success,
      data: result,
    });
  } catch (error) {
    console.error('Error syncing with partner:', error);
    return NextResponse.json({
      success: false,
      error: 'Sync failed',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
