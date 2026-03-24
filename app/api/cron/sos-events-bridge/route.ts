/**
 * GET /api/cron/sos-events-bridge
 *
 * Polls sos_events table for recent entries (last 35 min)
 * and emits SOS_CRITICAL events to the agent event bus.
 *
 * This bridges the protected SOS endpoint (DO NOT MODIFY)
 * to the agent system without modifying the SOS API.
 *
 * Запускать: каждые 30 минут (aligns with rescue agent schedule)
 * Защита: ?secret=CRON_SECRET
 *
 * cron-job.org:
 *   https://tourhab.ru/api/cron/sos-events-bridge?secret=SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';
import { emitEvent, AGENT_EVENTS } from '@/lib/events/emit';

export const dynamic = 'force-dynamic';

interface SosEventRow {
  id: string;
  lat: string | null;
  lng: string | null;
  status: string;
  notes: string | null;
  created_at: Date;
}

export async function GET(request: NextRequest) {
  const secret = request.headers.get('x-cron-secret')
    ?? request.nextUrl.searchParams.get('secret');

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Неавторизованный доступ' }, { status: 401 });
  }

  try {
    // Check for SOS events in last 35 minutes (runs every 30 min, 5 min overlap)
    const { rows } = await pool.query<SosEventRow>(
      `SELECT id::text, lat::text, lng::text, status, notes, created_at
       FROM sos_events
       WHERE created_at > NOW() - INTERVAL '35 minutes'
       ORDER BY created_at DESC`
    );

    let emittedCount = 0;
    for (const sos of rows) {
      emitEvent(AGENT_EVENTS.SOS_CRITICAL, 'sos_bridge', 'critical', {
        sosId: sos.id,
        lat: sos.lat ? parseFloat(sos.lat) : null,
        lng: sos.lng ? parseFloat(sos.lng) : null,
        status: sos.status,
        notes: sos.notes?.slice(0, 200) ?? null,
        createdAt: sos.created_at.toISOString(),
      });
      emittedCount++;
    }

    return NextResponse.json({
      success: true,
      data: { sosEventsProcessed: emittedCount },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
