import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError instanceof NextResponse) return authError;

  const { searchParams } = request.nextUrl;
  const q = searchParams.get('q') ?? '';
  const category = searchParams.get('category') ?? '';
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '50', 10), 200);

  const conditions: string[] = [];
  const params: unknown[] = [];
  let idx = 1;

  if (q) {
    conditions.push(`(search_vector @@ plainto_tsquery('simple', $${idx}) OR name ILIKE $${idx + 1})`);
    params.push(q.toLowerCase(), `%${q}%`);
    idx += 2;
  }
  if (category) {
    conditions.push(`category = $${idx}`);
    params.push(category);
    idx++;
  }

  const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const [toolsRes, statsRes] = await Promise.all([
    pool.query<{
      id: string; slug: string; name: string; description: string; url: string;
      category: string; tags: string[]; is_free: boolean; api_available: boolean;
      rating: string | null; use_count: number; source: string; last_used_at: string | null; created_at: string;
    }>(
      `SELECT id, slug, name, description, url, category, tags, is_free, api_available,
              rating, use_count, source, last_used_at, created_at
       FROM external_tools ${where}
       ORDER BY use_count DESC, name ASC
       LIMIT $${idx}`,
      [...params, limit],
    ),
    pool.query<{ category: string; cnt: string }>(
      `SELECT category, count(*) AS cnt FROM external_tools GROUP BY category ORDER BY cnt DESC`,
    ),
  ]);

  return NextResponse.json({
    tools: toolsRes.rows,
    stats: {
      total: toolsRes.rows.length,
      byCategory: statsRes.rows.map((r) => ({ category: r.category, count: parseInt(r.cnt, 10) })),
    },
  });
}

const CreateSchema = z.object({
  slug: z.string().min(2).max(120).regex(/^[a-z0-9-]+$/),
  name: z.string().min(2).max(200),
  description: z.string().min(5),
  url: z.string().url(),
  category: z.enum(['safety', 'geo', 'image', 'text', 'audio', 'data', 'travel', 'other']),
  tags: z.array(z.string()).default([]),
  is_free: z.boolean().default(true),
  api_available: z.boolean().default(false),
  rating: z.number().min(0).max(5).nullable().default(null),
});

export async function POST(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError instanceof NextResponse) return authError;

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: 'Невалидный JSON' }, { status: 400 }); }

  const parsed = CreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Ошибка валидации', details: parsed.error.flatten() }, { status: 422 });
  }

  const d = parsed.data;
  const { rows } = await pool.query<{ id: string }>(
    `INSERT INTO external_tools (slug, name, description, url, category, tags, is_free, api_available, rating, source)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'manual')
     ON CONFLICT (slug) DO UPDATE SET
       name=$2, description=$3, url=$4, category=$5, tags=$6,
       is_free=$7, api_available=$8, rating=$9, updated_at=NOW()
     RETURNING id`,
    [d.slug, d.name, d.description, d.url, d.category, d.tags, d.is_free, d.api_available, d.rating],
  );

  return NextResponse.json({ id: rows[0].id, slug: d.slug }, { status: 201 });
}
