/**
 * GET    /api/trips/[id]   — загрузить один сохранённый маршрут
 * PATCH  /api/trips/[id]   — обновить маршрут
 * DELETE /api/trips/[id]   — мягкое удаление
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/lib/db-pool';
import { requireAuth } from '@/lib/auth/middleware';
import type { UserTripRow } from '@/lib/types/db-rows';

export const dynamic = 'force-dynamic';

const DayPlanSchema = z.object({
  day: z.number().int().min(1),
  zone: z.enum(['avachinsky', 'western', 'eastern', 'northern']),
  title: z.string().min(1).max(255),
  activityType: z.string().max(50),
  priceFrom: z.number().min(0),
  priceTo: z.number().min(0),
  coords: z.tuple([z.number(), z.number()]),
  defaultTransport: z.enum(['walking', 'jeep', 'helicopter', 'boat']),
});

const UpdateTripSchema = z.object({
  title: z.string().min(1).max(255).optional(),
  arrivalDate: z.string().date().nullable().optional(),
  departureDate: z.string().date().nullable().optional(),
  places: z.array(z.string()).max(20).optional(),
  activities: z.array(z.string()).max(20).optional(),
  days: z.array(DayPlanSchema).max(30).optional(),
  transportByDay: z.record(z.string(), z.enum(['walking', 'jeep', 'helicopter', 'boat'])).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

async function getTripOwned(tripId: string, userId: string): Promise<UserTripRow | null> {
  const { rows } = await pool.query<UserTripRow>(
    'SELECT * FROM user_trips WHERE id = $1 AND user_id = $2 AND deleted_at IS NULL',
    [tripId, userId]
  );
  return rows[0] ?? null;
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest, ctx: RouteContext) {
  const authOrResponse = await requireAuth(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  const { id } = await ctx.params;
  const trip = await getTripOwned(id, authOrResponse.userId);

  if (!trip) {
    return NextResponse.json({ success: false, error: 'Маршрут не найден' }, { status: 404 });
  }

  return NextResponse.json({ success: true, data: trip });
}

// ─── PATCH ────────────────────────────────────────────────────────────────────

export async function PATCH(request: NextRequest, ctx: RouteContext) {
  const authOrResponse = await requireAuth(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  const { id } = await ctx.params;
  const existing = await getTripOwned(id, authOrResponse.userId);

  if (!existing) {
    return NextResponse.json({ success: false, error: 'Маршрут не найден' }, { status: 404 });
  }

  try {
    const body = await request.json();
    const parsed = UpdateTripSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Некорректные данные', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const d = parsed.data;

    const { rows } = await pool.query<UserTripRow>(`
      UPDATE user_trips SET
        title            = COALESCE($2, title),
        arrival_date     = CASE WHEN $3::TEXT IS NOT NULL THEN $3::DATE ELSE arrival_date END,
        departure_date   = CASE WHEN $4::TEXT IS NOT NULL THEN $4::DATE ELSE departure_date END,
        places           = COALESCE($5, places),
        activities       = COALESCE($6, activities),
        days             = COALESCE($7, days),
        transport_by_day = COALESCE($8, transport_by_day)
      WHERE id = $1
      RETURNING *
    `, [
      id,
      d.title ?? null,
      d.arrivalDate ?? null,
      d.departureDate ?? null,
      d.places ?? null,
      d.activities ?? null,
      d.days !== undefined ? JSON.stringify(d.days) : null,
      d.transportByDay !== undefined ? JSON.stringify(d.transportByDay) : null,
    ]);

    return NextResponse.json({ success: true, data: rows[0] });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ошибка при обновлении маршрута';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// ─── DELETE ───────────────────────────────────────────────────────────────────

export async function DELETE(request: NextRequest, ctx: RouteContext) {
  const authOrResponse = await requireAuth(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  const { id } = await ctx.params;
  const existing = await getTripOwned(id, authOrResponse.userId);

  if (!existing) {
    return NextResponse.json({ success: false, error: 'Маршрут не найден' }, { status: 404 });
  }

  await pool.query(
    'UPDATE user_trips SET deleted_at = NOW() WHERE id = $1',
    [id]
  );

  return NextResponse.json({ success: true });
}
