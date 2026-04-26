/**
 * GET /api/routes/nearby?lat=53.0&lng=158.65&limit=20&kind=place
 *
 * Returns routes from agent_route_knowledge sorted by distance
 * from the given coordinates. All computation is in JS (no PostGIS needed).
 *
 * Query params:
 *   lat, lng — required (WGS84)
 *   limit    — optional, max 50, default 20
 *   kind     — optional filter: 'place' | 'route' | 'tour'
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { distanceKm } from '@/lib/geo/kamchatka';

const VALID_KINDS = new Set(['place', 'route', 'tour']);

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const lat = parseFloat(searchParams.get('lat') || '');
  const lng = parseFloat(searchParams.get('lng') || '');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20', 10), 50);
  const kind = searchParams.get('kind') || '';

  if (isNaN(lat) || isNaN(lng)) {
    return NextResponse.json(
      { error: 'lat and lng are required query parameters' },
      { status: 400 },
    );
  }

  if (kind && !VALID_KINDS.has(kind)) {
    return NextResponse.json(
      { error: `kind must be one of: ${[...VALID_KINDS].join(', ')}` },
      { status: 400 },
    );
  }

  try {
    // Fetch all visible routes with coords (PostGIS not available, so we fetch
    // and sort in JS. ~1400 rows, <10ms on prod).
    const whereClauses = ['lat IS NOT NULL', 'lng IS NOT NULL', 'is_visible = TRUE'];
    const params: (string | number)[] = [];
    if (kind) {
      whereClauses.push('kind = $1');
      params.push(kind);
    }

    const { rows } = await pool.query(
      `SELECT id, title, lat, lng, description, category,
              activity_type, location_type, kind, source_url
       FROM agent_route_knowledge
       WHERE ${whereClauses.join(' AND ')}`,
      params,
    );

    const sorted = rows
      .map((r) => ({
        id: r.id as string,
        title: r.title as string,
        lat: parseFloat(r.lat as string),
        lng: parseFloat(r.lng as string),
        description: (r.description as string | null) ?? '',
        category: (r.category as string | null) ?? '',
        activityType: (r.activity_type as string | null) ?? '',
        locationType: (r.location_type as string | null) ?? '',
        kind: (r.kind as string | null) ?? '',
        sourceUrl: (r.source_url as string | null) ?? '',
        distanceKm: distanceKm(
          { lat, lng },
          { lat: parseFloat(r.lat as string), lng: parseFloat(r.lng as string) },
        ),
      }))
      .sort((a, b) => a.distanceKm - b.distanceKm)
      .slice(0, limit);

    return NextResponse.json({ routes: sorted, total: rows.length });
  } catch (err) {
    console.error('[nearby] query error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 },
    );
  }
}
