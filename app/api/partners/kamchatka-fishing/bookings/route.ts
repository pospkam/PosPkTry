import { NextRequest, NextResponse } from 'next/server';
import { KamchatkaFishingClient } from '@/lib/partners/kamchatka-fishing';
import { requireRole } from '@/lib/auth/middleware';

export const dynamic = 'force-dynamic';

// GET /api/partners/kamchatka-fishing/bookings - Получить бронирования
export async function GET(request: NextRequest) {
  try {
    const userOrResponse = await requireRole(request, ['operator', 'admin']);
    if (userOrResponse instanceof NextResponse) return userOrResponse;

    const apiKey = process.env.KAMCHATKA_FISHING_API_KEY;
    const apiSecret = process.env.KAMCHATKA_FISHING_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json({
        success: false,
        error: 'API credentials not configured',
      }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const from = searchParams.get('from') || undefined;
    const to = searchParams.get('to') || undefined;

    const client = new KamchatkaFishingClient({
      apiKey,
      apiSecret,
    });

    const bookings = await client.getBookings({ status, from, to });

    return NextResponse.json({
      success: true,
      data: {
        bookings,
        count: bookings.length,
      },
    });
  } catch (error) {
    console.error('Error fetching partner bookings:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to fetch bookings',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}

// POST /api/partners/kamchatka-fishing/bookings - Создать бронирование
export async function POST(request: NextRequest) {
  try {
    const userOrResponse = await requireRole(request, ['operator', 'admin']);
    if (userOrResponse instanceof NextResponse) return userOrResponse;

    const apiKey = process.env.KAMCHATKA_FISHING_API_KEY;
    const apiSecret = process.env.KAMCHATKA_FISHING_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json({
        success: false,
        error: 'API credentials not configured',
      }, { status: 400 });
    }

    const body = await request.json();
    const { tourId, customerName, customerPhone, customerEmail, date, participants, totalPrice } = body;

    if (!tourId || !customerName || !customerPhone || !date || !participants) {
      return NextResponse.json({
        success: false,
        error: 'Missing required fields',
      }, { status: 400 });
    }

    const client = new KamchatkaFishingClient({
      apiKey,
      apiSecret,
    });

    const booking = await client.createBooking({
      tourId,
      customerName,
      customerPhone,
      customerEmail: customerEmail || '',
      date,
      participants,
      totalPrice: totalPrice || 0,
    });

    return NextResponse.json({
      success: true,
      data: booking,
    });
  } catch (error) {
    console.error('Error creating partner booking:', error);
    return NextResponse.json({
      success: false,
      error: 'Failed to create booking',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
