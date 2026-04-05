/**
 * GET /api/operators
 * Публичный каталог операторов (is_public = true).
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';
import type { OperatorListRow } from '@/lib/types/db-rows';

export const dynamic = 'force-dynamic';

const QuerySchema = z.object({
  category: z.string().max(60).optional(),
  search:   z.string().max(200).optional(),
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(50).default(20),
});

export async function GET(request: NextRequest) {
  const parsed = QuerySchema.safeParse(
    Object.fromEntries(new URL(request.url).searchParams)
  );
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Неверные параметры запроса' }, { status: 400 });
  }

  const { category, search, page, limit } = parsed.data;
  const offset = (page - 1) * limit;

  const conditions: string[] = ['is_public = TRUE', 'slug IS NOT NULL'];
  const params: unknown[] = [];
  let idx = 1;

  if (category) {
    conditions.push(`category = $${idx}`);
    params.push(category);
    idx++;
  }
  if (search) {
    conditions.push(`(name ILIKE $${idx} OR short_description ILIKE $${idx})`);
    params.push(`%${search}%`);
    idx++;
  }

  const where = `WHERE ${conditions.join(' AND ')}`;

  try {
    const [dataRes, countRes] = await Promise.all([
      query<OperatorListRow>(
        `SELECT id, slug, name, category, short_description, hero_image,
                rating::text, review_count::text, is_verified
         FROM partners
         ${where}
         ORDER BY rating DESC, review_count DESC
         LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      ),
      query<{ total: string }>(
        `SELECT COUNT(*)::text AS total FROM partners ${where}`,
        params
      ),
    ]);

    const total = parseInt(countRes.rows[0]?.total ?? '0');

    return NextResponse.json({
      success: true,
      data: dataRes.rows.map(r => ({
        id:               r.id,
        slug:             r.slug,
        name:             r.name,
        category:         r.category,
        shortDescription: r.short_description,
        heroImage:        r.hero_image,
        rating:           parseFloat(r.rating ?? '0'),
        reviewCount:      parseInt(r.review_count ?? '0'),
        isVerified:       r.is_verified,
      })),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: true,
        data: [],
        meta: {
          total: 0,
          page,
          limit,
          pages: 0,
        },
        degraded: true,
      },
      { status: 200 }
    );
  }
}
