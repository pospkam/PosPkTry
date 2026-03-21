/**
 * GET /api/safety/alerts
 *
 * Public endpoint — returns active МЧС / safety alerts for the planner.
 * Optionally filtered by zone and date range.
 *
 * Query params:
 *   zone        — optional: avachinsky | western | eastern | northern | all
 *   arrivalDate — optional: YYYY-MM-DD
 *   departureDate — optional: YYYY-MM-DD
 */

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

const VALID_ZONES = ['avachinsky', 'western', 'eastern', 'northern', 'all'] as const;

const QuerySchema = z.object({
  zone:          z.enum(VALID_ZONES).optional(),
  arrivalDate:   z.string().date().optional(),
  departureDate: z.string().date().optional(),
});

interface AlertRow {
  id:           string;
  zone:         string;
  severity:     string;
  title:        string;
  message:      string;
  source:       string;
  active_from:  string;
  active_until: string | null;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const parsed = QuerySchema.safeParse({
      zone:          searchParams.get('zone') ?? undefined,
      arrivalDate:   searchParams.get('arrivalDate') ?? undefined,
      departureDate: searchParams.get('departureDate') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json({ success: false, error: 'Неверные параметры' }, { status: 400 });
    }

    const { zone, arrivalDate, departureDate } = parsed.data;

    const params: (string | null)[] = [];
    const conditions: string[] = ['is_active = TRUE'];

    if (zone && zone !== 'all') {
      params.push(zone);
      conditions.push(`(zone = $${params.length} OR zone = 'all')`);
    }

    if (arrivalDate && departureDate) {
      params.push(arrivalDate, departureDate);
      conditions.push(
        `(active_until IS NULL OR active_until >= $${params.length - 1}::date)`,
        `active_from <= $${params.length}::date`,
      );
    }

    const where = conditions.join(' AND ');

    const { rows } = await pool.query<AlertRow>(
      `SELECT id, zone, severity, title, message, source, active_from, active_until
       FROM safety_alerts
       WHERE ${where}
       ORDER BY severity = 'critical' DESC, severity = 'important' DESC, created_at DESC
       LIMIT 20`,
      params
    );

    return NextResponse.json({ success: true, data: rows });
  } catch (err) {
    // If table doesn't exist yet — return empty
    const msg = err instanceof Error ? err.message : '';
    if (msg.includes('does not exist')) {
      return NextResponse.json({ success: true, data: [] });
    }
    console.error('[SAFETY_ALERTS_GET]', err);
    return NextResponse.json({ success: false, error: 'Ошибка сервера' }, { status: 500 });
  }
}
