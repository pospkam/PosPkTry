/**
 * GET /api/hub/operator/weather?tour_id=123
 * Check weather for a specific operator tour
 * - Caches results 1 hour per coordinate to avoid API rate-limit
 * - Compares against tour's threshold settings
 * - Auth: operator only (not public)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireOperator } from '@/lib/auth/middleware';
import { notifyWeatherAlert } from '@/lib/notifications/operator-booking';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

// ============================================================
// In-memory cache: key = "lat,lng", TTL = 1h
// ============================================================
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

interface CacheEntry {
  data: OpenMeteoResult;
  expires_at: number;
}

const weatherCache = new Map<string, CacheEntry>();

// Per-tour alert cooldown — avoid spamming operator on every API call
const alertCooldown = new Map<string, number>(); // tourId → last alert timestamp
const ALERT_COOLDOWN_MS = 6 * 60 * 60 * 1000;   // 6 hours

interface OpenMeteoResult {
  wind_speed_kmh: number;   // current wind speed
  precipitation_mm: number; // next 3h precipitation sum
  visibility_m: number;     // estimated from cloud cover + weather code
  temperature_c: number;
  weather_code: number;
  fetched_at: string;
}

async function fetchWeather(lat: number, lng: number): Promise<OpenMeteoResult> {
  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  const cached = weatherCache.get(cacheKey);

  if (cached && cached.expires_at > Date.now()) {
    return cached.data;
  }

  const url =
    `https://api.open-meteo.com/v1/forecast?` +
    `latitude=${lat}&longitude=${lng}` +
    `&current=temperature_2m,wind_speed_10m,precipitation,weather_code,cloud_cover` +
    `&hourly=precipitation,visibility` +
    `&forecast_hours=6` +
    `&timezone=auto`;

  const response = await fetch(url, {
    headers: { 'User-Agent': 'KamchatourHub-OperatorTools/1.0' },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`open-meteo ${response.status}`);
  }

  const raw = await response.json();
  const current = raw.current;

  // Sum precipitation for next 3 hours
  const precipNext3h: number = (raw.hourly?.precipitation ?? []).slice(0, 3)
    .reduce((acc: number, v: number) => acc + (v || 0), 0);

  // Estimate visibility from cloud cover + WMO code
  const cloudCover: number = current.cloud_cover ?? 50;
  const wmoCode: number = current.weather_code ?? 0;
  const estimatedVisibility = estimateVisibilityM(wmoCode, cloudCover);

  const result: OpenMeteoResult = {
    wind_speed_kmh: Math.round(current.wind_speed_10m * 3.6),
    precipitation_mm: Math.round(precipNext3h * 10) / 10,
    visibility_m: estimatedVisibility,
    temperature_c: Math.round(current.temperature_2m),
    weather_code: wmoCode,
    fetched_at: new Date().toISOString(),
  };

  weatherCache.set(cacheKey, {
    data: result,
    expires_at: Date.now() + CACHE_TTL_MS,
  });

  return result;
}

/** Rough visibility estimate from WMO weather codes + cloud cover */
function estimateVisibilityM(wmoCode: number, cloudCover: number): number {
  if ([45, 48].includes(wmoCode)) return 200;      // fog
  if (wmoCode >= 95) return 1000;                  // thunderstorm
  if ([71, 73, 75, 77, 85, 86].includes(wmoCode)) return 2000;  // snow
  if ([65, 67].includes(wmoCode)) return 3000;     // heavy rain
  if ([61, 63].includes(wmoCode)) return 5000;     // rain
  if ([51, 53, 55, 80, 81, 82].includes(wmoCode)) return 7000;  // drizzle/showers
  if (cloudCover > 90) return 8000;
  if (cloudCover > 70) return 12000;
  return 20000;
}

// ============================================================
// Main handler
// ============================================================

export async function GET(request: NextRequest) {
  try {
    // Must be authenticated operator
    const authOrResponse = await requireOperator(request);
    if (authOrResponse instanceof NextResponse) return authOrResponse;

    const { searchParams } = new URL(request.url);
    const tourIdParam = searchParams.get('tour_id');

    if (!tourIdParam) {
      return NextResponse.json({ error: 'tour_id is required' }, { status: 400 });
    }

    const tourId = BigInt(tourIdParam);

    // Fetch tour with weather thresholds
    const tourResult = await query(
      `SELECT id, title, latitude, longitude,
              min_visibility_m, max_wind_kmh, max_precipitation_mm,
              weather_dependent, operator_id
       FROM operator_tours
       WHERE id = $1 AND deleted_at IS NULL LIMIT 1`,
      [tourId]
    );

    if (tourResult.rows.length === 0) {
      return NextResponse.json({ error: 'Tour not found' }, { status: 404 });
    }

    interface TourRow {
      title: string;
      latitude: string;
      longitude: string;
      min_visibility_m: number;
      max_wind_kmh: number;
      max_precipitation_mm: number;
      weather_dependent: boolean;
    }
    const tour = tourResult.rows[0] as unknown as TourRow;

    if (!tour.weather_dependent) {
      return NextResponse.json({
        success: true,
        weather_status: 'ok',
        message: 'Tour is not weather-dependent',
        tour_id: tourId.toString(),
      });
    }

    if (!tour.latitude || !tour.longitude) {
      return NextResponse.json({ error: 'Tour has no coordinates' }, { status: 422 });
    }

    // Fetch weather (cached 1h)
    const weather = await fetchWeather(
      parseFloat(tour.latitude),
      parseFloat(tour.longitude)
    );

    // Check thresholds
    const issues: string[] = [];

    if (weather.wind_speed_kmh > tour.max_wind_kmh) {
      issues.push(`Ветер ${weather.wind_speed_kmh} км/ч > лимит ${tour.max_wind_kmh} км/ч`);
    }
    if (weather.precipitation_mm > tour.max_precipitation_mm) {
      issues.push(`Осадки ${weather.precipitation_mm} мм > лимит ${tour.max_precipitation_mm} мм`);
    }
    if (weather.visibility_m < tour.min_visibility_m) {
      issues.push(`Видимость ~${weather.visibility_m} м < минимум ${tour.min_visibility_m} м`);
    }

    const weather_status = issues.length === 0 ? 'ok' : 'alert';

    // Send Telegram alert once per 6h per tour to avoid spam
    if (weather_status === 'alert') {
      const tourKey = tourId.toString();
      const lastAlert = alertCooldown.get(tourKey) ?? 0;

      if (Date.now() - lastAlert > ALERT_COOLDOWN_MS) {
        alertCooldown.set(tourKey, Date.now());

        // Count upcoming bookings in the next 7 days
        const bookingsResult = await query(
          `SELECT COALESCE(SUM(participants), 0) as total_participants
           FROM operator_bookings
           WHERE operator_tour_id = $1
             AND booking_date BETWEEN CURRENT_DATE AND CURRENT_DATE + 7
             AND booking_status NOT IN ('cancelled')
             AND deleted_at IS NULL`,
          [tourId]
        );
        const affected = parseInt(String(bookingsResult.rows[0]?.total_participants ?? '0'), 10);

        // Get operator telegram config
        const opResult = await query(
          `SELECT p.contacts->>'telegram_chat_id' as telegram_chat_id
           FROM operator_tours t
           JOIN partners p ON t.operator_id = p.id
           WHERE t.id = $1 LIMIT 1`,
          [tourId]
        );
        const tgChatId = opResult.rows[0]?.telegram_chat_id as string | undefined;

        notifyWeatherAlert(tourId, tour.title, issues, affected, tgChatId)
          .catch(() => undefined);
      }
    }

    return NextResponse.json({
      success: true,
      tour_id: tourId.toString(),
      tour_title: tour.title,
      weather_status,
      issues,
      weather,
      thresholds: {
        max_wind_kmh: tour.max_wind_kmh,
        max_precipitation_mm: tour.max_precipitation_mm,
        min_visibility_m: tour.min_visibility_m,
      },
      cached: true,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch weather data' }, { status: 500 });
  }
}
