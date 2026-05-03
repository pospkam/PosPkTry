/**
 * GET /api/places/[id]/gpx
 * Export a place as a GPX waypoint for offline navigation.
 */

import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!id || id.length < 10) {
    return new NextResponse('Некорректный ID', { status: 400 });
  }

  try {
    const result = await query(
      `SELECT name, description, lat, lng, location_type
       FROM places
       WHERE (ark_id::text = $1 OR id = $1) AND is_visible = true`,
      [id]
    );

    if (!result.rows[0]) {
      return new NextResponse('Место не найдено', { status: 404 });
    }

    const r = result.rows[0];
    const name = (r.name as string).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const desc = ((r.description as string | null) ?? '')
      .slice(0, 500)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const lat = parseFloat(r.lat as string);
    const lng = parseFloat(r.lng as string);
    const now = new Date().toISOString();

    const gpx = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="TourHab — tourhab.ru"
  xmlns="http://www.topografix.com/GPX/1/1"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd">
  <metadata>
    <name>${name}</name>
    <time>${now}</time>
    <link href="https://tourhab.ru/places/${id}">
      <text>${name} — TourHab</text>
    </link>
  </metadata>
  <wpt lat="${lat.toFixed(6)}" lon="${lng.toFixed(6)}">
    <name>${name}</name>
    <desc>${desc}</desc>
    <time>${now}</time>
    <type>${r.location_type ?? 'place'}</type>
  </wpt>
</gpx>`;

    const filename = encodeURIComponent(name.replace(/\s+/g, '_').slice(0, 60)) + '.gpx';

    return new NextResponse(gpx, {
      status: 200,
      headers: {
        'Content-Type': 'application/gpx+xml; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ошибка';
    return new NextResponse(message, { status: 500 });
  }
}
