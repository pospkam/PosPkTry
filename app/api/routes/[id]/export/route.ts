/**
 * GET /api/routes/[id]/export
 * Экспорт маршрута в GPX формате.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

// AUTH: Public — экспорт маршрута доступен всем (для навигаторов)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const { searchParams } = new URL(request.url);
  const format = searchParams.get('format') || 'gpx';

  if (!id || !/^[0-9a-f-]{36}$/.test(id)) {
    return NextResponse.json({ error: 'Некорректный ID' }, { status: 400 });
  }

  try {
    // Prefer kamchatka_routes (has geometry column); fall back to agent_route_knowledge view
    const result = await query<{
      id: string; title: string; description: string;
      lat: string; lng: string; location_type: string;
      activity_type: string; category: string;
      payload: Record<string, unknown>; geometry: { type?: string; coordinates?: number[][] } | null;
    }>(
      `SELECT
         COALESCE(kr.id::text, ark.id::text) AS id,
         COALESCE(kr.title, ark.title) AS title,
         COALESCE(kr.description, ark.description) AS description,
         COALESCE(kr.lat::text, ark.lat::text) AS lat,
         COALESCE(kr.lng::text, ark.lng::text) AS lng,
         ark.location_type,
         ark.activity_type,
         ark.category,
         ark.payload,
         kr.geometry
       FROM agent_route_knowledge ark
       LEFT JOIN kamchatka_routes kr ON kr.id = ark.id
       WHERE ark.id = $1 AND ark.is_visible = TRUE`,
      [id]
    );

    if (!result.rows[0]) {
      return NextResponse.json({ error: 'Маршрут не найден' }, { status: 404 });
    }

    const r = result.rows[0];
    const payload = (r.payload as Record<string, unknown>) ?? {};

    // Попытка получить trackpoints (геометрию трека)
    let trackpoints: { lat: number; lng: number; elevation?: number }[] = [];

    // 1. Direct geometry column on kamchatka_routes (highest priority)
    const directGeom = r.geometry as { type?: string; coordinates?: number[][] } | null;
    if (directGeom?.type === 'LineString' && Array.isArray(directGeom.coordinates)) {
      trackpoints = directGeom.coordinates
        .filter(c => Array.isArray(c) && c.length >= 2)
        .map(c => ({ lng: c[0], lat: c[1], elevation: c[2] as number | undefined }));
    }

    // 2. Legacy: geometry in payload JSONB
    if (trackpoints.length === 0) {
      const geom = payload.geometry as { type?: string; coordinates?: number[][] } | null;
      if (geom?.type === 'LineString' && Array.isArray(geom.coordinates)) {
        trackpoints = geom.coordinates
          .filter(c => Array.isArray(c) && c.length >= 2)
          .map(c => ({ lng: c[0], lat: c[1], elevation: c[2] as number | undefined }));
      }
    }

    // 3. Legacy: track array in payload
    const track = payload.track as { lat: number; lng: number; elevation?: number }[] | null;
    if (trackpoints.length === 0 && track && track.length > 0) {
      trackpoints = track;
    }

    // Fallback: если нет trackpoints, используем центр маршрута
    if (trackpoints.length === 0 && r.lat && r.lng) {
      trackpoints = [{ lat: parseFloat(r.lat), lng: parseFloat(r.lng) }];
    }

    // Генерация GPX
    const lines: string[] = [];
    lines.push('<?xml version="1.0" encoding="UTF-8"?>');
    lines.push('<gpx version="1.1" creator="TourHab" xmlns="http://www.topografix.com/GPX/1/1">');
    lines.push('  <metadata>');
    lines.push(`    <name>${escapeXml(r.title as string)}</name>`);
    const desc = (r.description as string || '').replace(/<[^>]+>/g, '').slice(0, 200);
    if (desc) {
      lines.push(`    <desc>${escapeXml(desc)}</desc>`);
    }
    lines.push('    <author>');
    lines.push('      <name>TourHab — tourhab.ru</name>');
    lines.push('    </author>');
    lines.push('  </metadata>');

    if (trackpoints.length > 1) {
      // Track (маршрут с треком)
      lines.push('  <trk>');
      lines.push(`    <name>${escapeXml(r.title as string)}</name>`);
      lines.push('    <trkseg>');
      for (const pt of trackpoints) {
        lines.push(`      <trkpt lat="${pt.lat}" lon="${pt.lng}">`);
        if (pt.elevation) {
          lines.push(`        <ele>${pt.elevation}</ele>`);
        }
        lines.push('      </trkpt>');
      }
      lines.push('    </trkseg>');
      lines.push('  </trk>');
    } else if (trackpoints.length === 1) {
      // Waypoint (одна точка)
      const pt = trackpoints[0];
      lines.push(`  <wpt lat="${pt.lat}" lon="${pt.lng}">`);
      lines.push(`    <name>${escapeXml(r.title as string)}</name>`);
      const locType = r.location_type || r.activity_type || r.category;
      if (locType) {
        lines.push(`    <type>${escapeXml(locType as string)}</type>`);
      }
      lines.push('  </wpt>');
    }

    lines.push('</gpx>');

    const gpxContent = lines.join('\n');
    const filename = slugify(r.title as string) + '.gpx';

    return new NextResponse(gpxContent, {
      headers: {
        'Content-Type': 'application/gpx+xml',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=86400',
      },
    });
  } catch (error) {
    console.error('GPX export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-zа-яё0-9\s-]/gi, '')
    .replace(/\s+/g, '_')
    .slice(0, 50) || 'route';
}
