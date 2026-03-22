/**
 * GET  /api/trips          — список сохранённых маршрутов авторизованного пользователя
 * POST /api/trips          — создать новый сохранённый маршрут
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/lib/db-pool';
import { requireAuth } from '@/lib/auth/middleware';
import type { UserTripListRow, UserTripRow } from '@/lib/types/db-rows';

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

const CreateTripSchema = z.object({
  title: z.string().min(1).max(255).default('Мой маршрут'),
  arrivalDate: z.string().date().nullable().optional(),
  departureDate: z.string().date().nullable().optional(),
  places: z.array(z.string()).max(20).default([]),
  activities: z.array(z.string()).max(20).default([]),
  days: z.array(DayPlanSchema).max(30).default([]),
  transportByDay: z.record(z.string(), z.enum(['walking', 'jeep', 'helicopter', 'boat'])).default({}),
  flightArrival: z.string().max(20).nullable().optional(),
  flightDeparture: z.string().max(20).nullable().optional(),
  flightArrivalTime: z.string().max(5).nullable().optional(),
  flightDepartureTime: z.string().max(5).nullable().optional(),
  needsAirportTransfer: z.boolean().default(false).optional(),
});

// ─── GET — list ───────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const authOrResponse = await requireAuth(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  const userId = authOrResponse.userId;

  try {
    const { rows } = await pool.query<UserTripListRow>(`
      SELECT
        id, title,
        arrival_date, departure_date,
        places, activities,
        jsonb_array_length(days) AS days_count,
        created_at, updated_at
      FROM user_trips
      WHERE user_id = $1
        AND deleted_at IS NULL
      ORDER BY updated_at DESC
      LIMIT 50
    `, [userId]);

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ошибка при загрузке маршрутов';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

// ─── POST — create ────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const authOrResponse = await requireAuth(request);
  if (authOrResponse instanceof NextResponse) return authOrResponse;

  const userId = authOrResponse.userId;

  try {
    const body = await request.json();
    const parsed = CreateTripSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: 'Некорректные данные', details: parsed.error.errors },
        { status: 400 }
      );
    }

    const { title, arrivalDate, departureDate, places, activities, days, transportByDay, flightArrival, flightDeparture, flightArrivalTime, flightDepartureTime, needsAirportTransfer } = parsed.data;

    const { rows } = await pool.query<UserTripRow>(`
      INSERT INTO user_trips
        (user_id, title, arrival_date, departure_date, places, activities, days, transport_by_day,
         flight_arrival, flight_departure, flight_arrival_time, flight_departure_time, needs_airport_transfer)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      userId,
      title,
      arrivalDate ?? null,
      departureDate ?? null,
      places,
      activities,
      JSON.stringify(days),
      JSON.stringify(transportByDay),
      flightArrival ?? null,
      flightDeparture ?? null,
      flightArrivalTime ?? null,
      flightDepartureTime ?? null,
      needsAirportTransfer ?? false,
    ]);

    return NextResponse.json({ success: true, data: rows[0] }, { status: 201 });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return NextResponse.json(
        { success: false, error: 'Некорректные данные', details: err.errors },
        { status: 400 }
      );
    }
    const msg = err instanceof Error ? err.message : 'Ошибка при сохранении маршрута';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
