import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { generateAndStoreRouteImage } from '@/lib/services/ai-image-generator';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

interface Props { params: Promise<{ routeId: string }> }

/** GET /api/images/route/[routeId] — serve AI image from DB, auto-generate if missing */
export async function GET(req: NextRequest, { params }: Props) {
  const { routeId } = await params;

  // UUID validation
  if (!/^[0-9a-f-]{36}$/.test(routeId)) {
    return new NextResponse('Not found', { status: 404 });
  }

  // Try to serve from DB
  try {
    const { rows } = await pool.query(
      'SELECT image_data, mime_type FROM ai_route_images WHERE route_id = $1',
      [routeId],
    );

    if (rows.length > 0) {
      return new NextResponse(rows[0].image_data as Buffer, {
        headers: {
          'Content-Type': rows[0].mime_type as string,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Source': 'ai-cache',
        },
      });
    }
  } catch {
    // DB unavailable
  }

  // Not cached yet — look up route and generate
  try {
    const result = await query<{
      id: string; title: string; location_type: string | null; description: string;
    }>(
      'SELECT id, title, location_type, description FROM agent_route_knowledge WHERE id = $1 AND is_visible = TRUE',
      [routeId],
    );

    if (!result.rows[0]) {
      return new NextResponse('Not found', { status: 404 });
    }

    const r = result.rows[0];
    await generateAndStoreRouteImage(r.id, r.title, r.location_type, r.description ?? '');

    // Now serve from DB
    const { rows } = await pool.query(
      'SELECT image_data, mime_type FROM ai_route_images WHERE route_id = $1',
      [routeId],
    );

    if (rows.length > 0) {
      return new NextResponse(rows[0].image_data as Buffer, {
        headers: {
          'Content-Type': rows[0].mime_type as string,
          'Cache-Control': 'public, max-age=31536000, immutable',
          'X-Source': 'ai-generated',
        },
      });
    }
  } catch (e) {

  }

  return new NextResponse('Image unavailable', { status: 503 });
}
