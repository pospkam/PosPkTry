/**
 * GET  /api/places/[id]/reviews — список отзывов о месте
 * POST /api/places/[id]/reviews — оставить отзыв (анонимно, с rate-limit)
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { query } from '@/lib/database';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

const reviewLimiter = createRateLimiter({ windowMs: 60_000 * 60, max: 3 }); // 3 в час

const PostSchema = z.object({
  rating:     z.number().int().min(1).max(5),
  comment:    z.string().trim().max(3000).optional().default(''),
  authorName: z.string().trim().min(1).max(100).default('Турист'),
});

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id || id.length < 10) {
    return NextResponse.json({ success: false, error: 'Некорректный ID' }, { status: 400 });
  }

  try {
    const place = await query(
      `SELECT ark_id FROM places WHERE (ark_id::text = $1 OR id = $1) AND is_visible = true`,
      [id]
    );
    if (!place.rows[0]) {
      return NextResponse.json({ success: false, error: 'Место не найдено' }, { status: 404 });
    }
    const placeId = place.rows[0].ark_id as string;

    const result = await query(
      `SELECT rv.id, rv.rating, rv.comment, rv.created_at,
         COALESCE(rv.author_name, u.name, 'Турист') AS author_name
       FROM reviews rv
       LEFT JOIN users u ON u.id = rv.user_id
       WHERE rv.place_id = $1
       ORDER BY rv.created_at DESC
       LIMIT 50`,
      [placeId]
    );

    return NextResponse.json({
      success: true,
      data: result.rows.map(r => ({
        id:         r.id as string,
        rating:     Number(r.rating),
        comment:    r.comment as string | null,
        authorName: r.author_name as string,
        createdAt:  r.created_at as string,
      })),
    });
  } catch (err: unknown) {
    return NextResponse.json({ success: false, error: 'Ошибка загрузки отзывов' }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const ip = getClientIp(req.headers);
  if (!reviewLimiter.check(ip)) {
    return NextResponse.json(
      { success: false, error: 'Слишком много отзывов. Попробуйте через час.' },
      { status: 429 }
    );
  }

  const { id } = await params;
  if (!id || id.length < 10) {
    return NextResponse.json({ success: false, error: 'Некорректный ID' }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const parsed = PostSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { success: false, error: 'Неверные данные', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  try {
    const place = await query(
      `SELECT ark_id FROM places WHERE (ark_id::text = $1 OR id = $1) AND is_visible = true`,
      [id]
    );
    if (!place.rows[0]) {
      return NextResponse.json({ success: false, error: 'Место не найдено' }, { status: 404 });
    }
    const placeId = place.rows[0].ark_id as string;

    const { rating, comment, authorName } = parsed.data;

    const result = await query(
      `INSERT INTO reviews (place_id, rating, comment, author_name, is_verified)
       VALUES ($1, $2, $3, $4, false)
       RETURNING id, created_at`,
      [placeId, rating, comment || null, authorName]
    );

    return NextResponse.json({
      success: true,
      data: { id: result.rows[0].id, createdAt: result.rows[0].created_at },
      message: 'Спасибо за отзыв!',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Ошибка';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
