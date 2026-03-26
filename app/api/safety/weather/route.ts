import { NextResponse } from 'next/server';

// Cache weather for 10 minutes
let cache: { data: unknown; ts: number } | null = null;
const CACHE_TTL = 10 * 60 * 1000;

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const res = await fetch(
      'https://wttr.in/Petropavlovsk-Kamchatsky?format=j1',
      { signal: AbortSignal.timeout(8000) }
    );
    if (!res.ok) {
      return NextResponse.json({ error: 'Сервис погоды недоступен' }, { status: 502 });
    }
    const raw = await res.json() as {
      current_condition?: Array<{
        temp_C: string;
        FeelsLikeC: string;
        humidity: string;
        windspeedKmph: string;
        lang_ru?: Array<{ value: string }>;
        weatherDesc?: Array<{ value: string }>;
      }>;
    };
    const cur = raw.current_condition?.[0];
    if (!cur) {
      return NextResponse.json({ error: 'Нет данных от сервиса погоды' }, { status: 502 });
    }
    const data = {
      tempC: cur.temp_C,
      feelsLikeC: cur.FeelsLikeC,
      desc: cur.lang_ru?.[0]?.value || cur.weatherDesc?.[0]?.value || '—',
      humidity: cur.humidity,
      windKmph: cur.windspeedKmph,
      updatedAt: new Date().toISOString(),
    };
    cache = { data, ts: Date.now() };
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Не удалось загрузить прогноз погоды' }, { status: 502 });
  }
}
