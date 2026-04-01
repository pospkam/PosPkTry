import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/lib/database';
import { requireAdmin } from '@/lib/auth/middleware';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const UpdateRouteSchema = z.object({
  isVisible:   z.boolean().optional(),
  title:       z.string().min(1).max(300).optional(),
  description: z.string().nullable().optional(),
  category:    z.string().optional(),
  lat:         z.number().nullable().optional(),
  lng:         z.number().nullable().optional(),
  difficulty:  z.string().nullable().optional(),
  duration:    z.string().nullable().optional(),
  season:      z.string().nullable().optional(),
  price_from:  z.string().nullable().optional(),
});

interface RouteDetail {
  id: string;
  title: string;
  category: string;
  description: string | null;
  lat: number | null;
  lng: number | null;
  source_url: string | null;
  source_name: string | null;
  is_visible: boolean;
  difficulty: string | null;
  duration: string | null;
  season: string | null;
  price_from: string | null;
}

/**
 * GET /api/admin/content/routes/[id]
 * Полные данные маршрута для формы редактирования.
 */
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const adminOrResponse = await requireAdmin(request);
  if (adminOrResponse instanceof NextResponse) return adminOrResponse;

  const { id } = await context.params;

  const result = await query<RouteDetail>(
    `SELECT id, title, category, description, lat, lng, source_url, source_name, is_visible,
            payload->>'difficulty' as difficulty,
            payload->>'duration'   as duration,
            payload->>'season'     as season,
            payload->>'price_from' as price_from
     FROM agent_route_knowledge WHERE id = $1 LIMIT 1`,
    [id]
  );

  if (!result.rows[0]) {
    return NextResponse.json({ success: false, error: 'Маршрут не найден' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: result.rows[0] });
}

/**
 * PUT /api/admin/content/routes/[id]
 * Обновление видимости и/или контентных полей маршрута.
 */
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const adminOrResponse = await requireAdmin(request);
  if (adminOrResponse instanceof NextResponse) return adminOrResponse;

  const { id } = await context.params;

  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ success: false, error: 'Неверный JSON' }, { status: 400 });
  }

  const parsed = UpdateRouteSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ success: false, error: 'Некорректные данные' }, { status: 400 });
  }

  const { isVisible, title, description, category, lat, lng, difficulty, duration, season, price_from } = parsed.data;

  // Динамически строим SET-клозы
  const setClauses: string[] = ['updated_at = NOW()'];
  const params: unknown[] = [];
  let idx = 1;

  if (isVisible   !== undefined) { setClauses.push(`is_visible  = $${idx++}`); params.push(isVisible); }
  if (title       !== undefined) { setClauses.push(`title       = $${idx++}`); params.push(title); }
  if (description !== undefined) { setClauses.push(`description = $${idx++}`); params.push(description); }
  if (category    !== undefined) { setClauses.push(`category    = $${idx++}`); params.push(category); }
  if (lat         !== undefined) { setClauses.push(`lat         = $${idx++}`); params.push(lat); }
  if (lng         !== undefined) { setClauses.push(`lng         = $${idx++}`); params.push(lng); }

  const payloadPatch: Record<string, string | null> = {};
  if (difficulty !== undefined) payloadPatch.difficulty = difficulty;
  if (duration   !== undefined) payloadPatch.duration   = duration;
  if (season     !== undefined) payloadPatch.season     = season;
  if (price_from !== undefined) payloadPatch.price_from = price_from;

  if (Object.keys(payloadPatch).length > 0) {
    setClauses.push(`payload = COALESCE(payload, '{}'::jsonb) || $${idx++}::jsonb`);
    params.push(JSON.stringify(payloadPatch));
  }

  params.push(id);

  try {
    const result = await query<{ id: string; title: string; category: string; is_visible: boolean }>(
      `UPDATE agent_route_knowledge
       SET ${setClauses.join(', ')}
       WHERE id = $${idx}
       RETURNING id, title, category, is_visible`,
      params
    );

    if (!result.rows[0]) {
      return NextResponse.json({ success: false, error: 'Маршрут не найден' }, { status: 404 });
    }

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch {
    return NextResponse.json({ success: false, error: 'Ошибка обновления' }, { status: 500 });
  }
}
