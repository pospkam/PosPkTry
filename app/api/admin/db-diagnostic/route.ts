/**
 * GET /api/admin/db-diagnostic
 * Диагностика состояния базы данных. Защищён токеном ?token=<DIAGNOSTIC_TOKEN>.
 * Не требует полной авторизации — для первичной диагностики проблем с DB.
 */

import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  const expectedToken = process.env.DIAGNOSTIC_TOKEN ?? 'kh-diag-2026';
  if (token !== expectedToken) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const results: Record<string, unknown> = { ts: new Date().toISOString() };

  try {
    await pool.query('SELECT 1');
    results.db_ping = 'ok';
  } catch (e) {
    results.db_ping = 'failed';
    results.db_error = e instanceof Error ? e.message : String(e);
    return NextResponse.json(results, { status: 200 });
  }

  const checks: Array<{ key: string; sql: string }> = [
    { key: 'places_total',        sql: `SELECT COUNT(*)::int AS n FROM places` },
    { key: 'places_visible',      sql: `SELECT COUNT(*)::int AS n FROM places WHERE is_visible = true` },
    { key: 'places_hidden',       sql: `SELECT COUNT(*)::int AS n FROM places WHERE is_visible = false` },
    { key: 'routes_total',        sql: `SELECT COUNT(*)::int AS n FROM kamchatka_routes` },
    { key: 'routes_visible',      sql: `SELECT COUNT(*)::int AS n FROM kamchatka_routes WHERE is_visible = true` },
    { key: 'ark_view_exists',     sql: `SELECT COUNT(*)::int AS n FROM information_schema.views WHERE table_name = 'agent_route_knowledge'` },
    { key: 'ark_place_visible',   sql: `SELECT COUNT(*)::int AS n FROM agent_route_knowledge WHERE kind = 'place' AND is_visible = true` },
    { key: 'ark_route_visible',   sql: `SELECT COUNT(*)::int AS n FROM agent_route_knowledge WHERE kind = 'route' AND is_visible = true` },
    { key: 'migrations_applied',  sql: `SELECT COUNT(*)::int AS n FROM _migrations` },
    { key: 'migrations_last',     sql: `SELECT name FROM _migrations ORDER BY applied_at DESC LIMIT 1` },
  ];

  for (const { key, sql } of checks) {
    try {
      const res = await pool.query(sql);
      results[key] = res.rows[0]?.n ?? res.rows[0];
    } catch (e) {
      results[key] = `ERROR: ${e instanceof Error ? e.message : String(e)}`;
    }
  }

  return NextResponse.json(results, { status: 200 });
}
