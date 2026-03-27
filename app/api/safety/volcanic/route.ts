/**
 * GET /api/safety/volcanic
 * Публичный. Возвращает последние вулканические события из external_alerts.
 */
import { NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

export interface VolcanicEvent {
  id: string;
  title: string;
  description: string | null;
  severity: number;
  affected_zones: string[];
  created_at: string;
  expires_at: string | null;
  source_url: string | null;
}

export async function GET() {
  try {
    const { rows } = await pool.query<VolcanicEvent>(`
      SELECT
        id::text,
        title,
        description,
        severity,
        COALESCE(affected_zones, ARRAY[]::TEXT[]) AS affected_zones,
        created_at,
        expires_at,
        source_url
      FROM external_alerts
      WHERE alert_type = 'volcanic_eruption'
        AND (expires_at IS NULL OR expires_at > NOW() - INTERVAL '7 days')
      ORDER BY created_at DESC
      LIMIT 20
    `);

    return NextResponse.json({ events: rows });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown';
    return NextResponse.json({ events: [], error: msg });
  }
}
