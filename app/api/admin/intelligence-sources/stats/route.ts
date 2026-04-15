import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/intelligence-sources/stats
 * Intelligence system overview: source health, run history, memory counts
 */
export async function GET(request: NextRequest) {
  const authErr = await requireAdmin(request);
  if (authErr instanceof NextResponse) return authErr;

  try {
    // Source health
    const { rows: sourceStats } = await pool.query<{
      total: string; active: string; errored: string;
    }>(`
      SELECT
        COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE active = true)::text AS active,
        COUNT(*) FILTER (WHERE fetch_error_count > 0 AND active = true)::text AS errored
      FROM intelligence_sources
    `);

    // Recent runs
    const { rows: runs } = await pool.query<{
      id: string; status: string; started_at: string; duration_ms: number | null;
      items_processed: number | null; items_created: number | null;
      errors_count: number; error_msg: string | null;
    }>(`
      SELECT id, status, started_at::text, duration_ms,
             items_processed, items_created, errors_count, error_msg
      FROM agent_run_history
      WHERE agent_id = 'intelligence'
      ORDER BY started_at DESC
      LIMIT 20
    `);

    // Memory counts (intelligence entries)
    const { rows: memStats } = await pool.query<{ total: string; recent: string }>(`
      SELECT
        COUNT(*)::text AS total,
        COUNT(*) FILTER (WHERE created_at > NOW() - INTERVAL '24 hours')::text AS recent
      FROM agent_memory
      WHERE memory_type = 'intelligence'
    `);

    // Per-domain breakdown
    const { rows: domainBreakdown } = await pool.query<{
      domain: string; source_count: string; last_fetch: string | null;
    }>(`
      SELECT domain,
             COUNT(*)::text AS source_count,
             MAX(last_fetched_at)::text AS last_fetch
      FROM intelligence_sources
      WHERE active = true AND source_type = 'rss'
      GROUP BY domain
      ORDER BY domain
    `);

    return NextResponse.json({
      success: true,
      sources: {
        total: parseInt(sourceStats[0]?.total ?? '0'),
        active: parseInt(sourceStats[0]?.active ?? '0'),
        errored: parseInt(sourceStats[0]?.errored ?? '0'),
      },
      memory: {
        total: parseInt(memStats[0]?.total ?? '0'),
        last_24h: parseInt(memStats[0]?.recent ?? '0'),
      },
      domains: domainBreakdown,
      runs,
    });
  } catch (err) {
    console.error('[admin/intelligence-sources/stats] failed:', err instanceof Error ? err.message : err);
    return NextResponse.json({ success: false, error: 'Ошибка загрузки статистики' }, { status: 500 });
  }
}
