import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { requireAdmin } from '@/lib/auth/middleware';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const CollectionSchema = z.object({
  slug: z.string().min(1).max(120).regex(/^[a-z0-9-]+$/),
  title: z.string().min(1).max(255),
  description: z.string().optional(),
  cover_image: z.string().url().optional().or(z.literal('')),
  place_ids: z.array(z.string().uuid()).default([]),
  route_ids: z.array(z.string().uuid()).default([]),
  tags: z.array(z.string()).default([]),
  is_public: z.boolean().default(true),
});

export async function GET(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const { rows } = await pool.query(
    `SELECT id, slug, title, description, tags, is_public, view_count, created_at,
            array_length(place_ids, 1) AS place_count,
            array_length(route_ids, 1) AS route_count
     FROM collections ORDER BY created_at DESC`
  );
  return NextResponse.json({ collections: rows });
}

export async function POST(req: NextRequest) {
  const authError = await requireAdmin(req);
  if (authError) return authError;

  const body = await req.json().catch(() => null);
  const parsed = CollectionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? 'Неверные данные' }, { status: 400 });
  }

  const { slug, title, description, cover_image, place_ids, route_ids, tags, is_public } = parsed.data;

  const { rows: [col] } = await pool.query(
    `INSERT INTO collections (slug, title, description, cover_image, place_ids, route_ids, tags, is_public)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id, slug, title`,
    [slug, title, description ?? null, cover_image || null, place_ids, route_ids, tags, is_public]
  );

  return NextResponse.json({ success: true, collection: col }, { status: 201 });
}
