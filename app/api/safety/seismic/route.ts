import { NextResponse } from 'next/server';

// Cache seismic data for 5 minutes
let cache: { data: unknown; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000;

interface USGSFeature {
  id: string;
  properties: { mag: number; place: string; time: number };
  geometry: { coordinates: [number, number, number] };
}

export async function GET() {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const url =
      'https://earthquake.usgs.gov/fdsnws/event/1/query' +
      '?format=geojson&minlatitude=50&maxlatitude=63&minlongitude=155&maxlongitude=165' +
      '&minmagnitude=2.5&limit=10&orderby=time';

    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) {
      return NextResponse.json({ error: 'Сервис USGS недоступен' }, { status: 502 });
    }
    const raw = await res.json() as { features: USGSFeature[] };
    const events = (raw.features || []).map((f) => ({
      id: f.id,
      magnitude: f.properties.mag,
      place: f.properties.place,
      time: f.properties.time,
      depth: f.geometry.coordinates[2],
    }));
    const data = { events, updatedAt: new Date().toISOString() };
    cache = { data, ts: Date.now() };
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Не удалось загрузить данные USGS Earthquake' }, { status: 502 });
  }
}
