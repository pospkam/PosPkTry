import { NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type') ?? 'all'; // places | routes | all
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '12', 10), 50);

  const results: Record<string, unknown> = {};

  if (type === 'all' || type === 'places') {
    const { rows } = await pool.query(
      `SELECT p.id, p.name, p.location_type, p.lat, p.lng, p.view_count,
              (SELECT ai.image_url FROM ai_route_images ai WHERE ai.route_id = p.ark_id LIMIT 1) AS image_url
       FROM places p
       ORDER BY p.view_count DESC, p.created_at DESC
       LIMIT $1`,
      [limit]
    );
    results.places = rows;
  }

  if (type === 'all' || type === 'routes') {
    const { rows } = await pool.query(
      `SELECT id, title, difficulty, distance_km, duration_hours, activity_type, view_count
       FROM kamchatka_routes
       ORDER BY view_count DESC, created_at DESC
       LIMIT $1`,
      [limit]
    );
    results.routes = rows;
  }

  return NextResponse.json(results);
}
