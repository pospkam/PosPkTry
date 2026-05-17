import { NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tag = searchParams.get('tag');
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50);

  const conditions = ['c.is_public = TRUE'];
  const params: unknown[] = [];

  if (tag) {
    params.push(tag);
    conditions.push(`$${params.length} = ANY(c.tags)`);
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const { rows } = await pool.query(
    `SELECT
       c.id, c.slug, c.title, c.description, c.cover_image,
       c.tags, c.view_count, c.created_at,
       array_length(c.place_ids, 1) AS place_count,
       array_length(c.route_ids, 1) AS route_count
     FROM collections c
     ${where}
     ORDER BY c.view_count DESC, c.created_at DESC
     LIMIT $${params.length + 1}`,
    [...params, limit]
  );

  return NextResponse.json({ collections: rows });
}
