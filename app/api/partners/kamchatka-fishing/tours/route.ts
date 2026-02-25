import { NextRequest, NextResponse } from 'next/server';
import { 
  KamchatkaFishingClient,
  transformFishingTour 
} from '@/lib/partners/kamchatka-fishing';

export const dynamic = 'force-dynamic';

// GET /api/partners/kamchatka-fishing/tours - Получить туры партнера
// TODO: AUTH — проверить необходимость публичного доступа; для приватного доступа добавить verifyAuth/authorizeRole и проверку роли.
export async function GET(request: NextRequest) {
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

    const tours = await client.getTours();
    const transformedTours = tours.map(transformFishingTour);

    return NextResponse.json({
      success: true,
      data: {
        tours: transformedTours,
        count: transformedTours.length,
        source: 'kamchatka-fishing',
      },
    });
  } catch (error) {
    console.error('Error fetching partner tours:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch tours',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
