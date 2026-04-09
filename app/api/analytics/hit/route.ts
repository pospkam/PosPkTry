/**
 * POST /api/analytics/hit
 * Публичный endpoint для трекинга просмотров страниц.
 * Вызывается клиентским компонентом PageViewTracker.
 */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/lib/db-pool';
import { createRateLimiter, getClientIp } from '@/lib/rate-limit';

const HitSchema = z.object({
  path:     z.string().min(1).max(500),
  referrer: z.string().max(500).optional(),
});

const hitLimiter = createRateLimiter({ windowMs: 10_000, max: 20 });

export async function POST(req: NextRequest) {
  // Базовая защита от ботов
  const ip = getClientIp(req.headers);
  if (!hitLimiter.check(ip)) {
    return NextResponse.json({ ok: false }, { status: 429 });
  }

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ ok: false }, { status: 400 }); }

  const parsed = HitSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ ok: false }, { status: 400 });

  const { path, referrer } = parsed.data;

  // Не трекаем системные и админские пути
  if (path.startsWith('/api/') || path.startsWith('/_next/') || path.startsWith('/hub/admin')) {
    return NextResponse.json({ ok: true });
  }

  await pool.query(
    `INSERT INTO page_views (path, referrer) VALUES ($1, $2)`,
    [path, referrer ?? null]
  ).catch(() => { /* не критично */ });

  return NextResponse.json({ ok: true });
}
