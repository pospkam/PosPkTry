import { NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

interface RouteParams { params: Promise<{ slug: string }> }

export async function GET(_req: Request, { params }: RouteParams) {
  const { slug } = await params;

  if (!/^[a-z0-9-]{1,120}$/.test(slug)) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const { rows: [col] } = await pool.query(
    `SELECT id, slug, title, description, cover_image, place_ids, route_ids, tags, view_count, created_at
     FROM collections WHERE slug = $1 AND is_public = TRUE`,
    [slug]
  );

  if (!col) return NextResponse.json({ error: 'not_found' }, { status: 404 });

  // Increment view count (fire-and-forget)
  pool.query('UPDATE collections SET view_count = view_count + 1 WHERE slug = $1', [slug]).catch(() => {});

  // Fetch places
  const places = col.place_ids?.length
    ? (await pool.query(
        `SELECT p.id, p.name, p.location_type, p.lat, p.lng, p.description,
                (SELECT ai.image_url FROM ai_route_images ai WHERE ai.route_id = p.ark_id LIMIT 1) AS image_url
         FROM places p WHERE p.id = ANY($1::uuid[])`,
        [col.place_ids]
      )).rows
    : [];

  // Fetch routes
  const routes = col.route_ids?.length
    ? (await pool.query(
        `SELECT id, title, difficulty, distance_km, duration_hours, activity_type, description
         FROM kamchatka_routes WHERE id = ANY($1::uuid[])`,
        [col.route_ids]
      )).rows
    : [];

  return NextResponse.json({ collection: { ...col, places, routes } });
}
