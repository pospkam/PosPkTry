import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authError = await requireAdmin(request);
  if (authError instanceof NextResponse) return authError;

  try {
    // 1. Agent memory stats per agent
    const { rows: memoryStats } = await pool.query(`
      SELECT
        agent_id,
        COUNT(*)::int AS total,
        COUNT(*) FILTER (WHERE memory_tier = 1)::int AS tier1,
        COUNT(*) FILTER (WHERE memory_tier = 2)::int AS tier2,
        COUNT(*) FILTER (WHERE memory_tier = 3)::int AS tier3,
        ROUND(AVG(confidence)::numeric, 2) AS avg_confidence,
        MAX(updated_at)::text AS last_updated
      FROM agent_memory
      GROUP BY agent_id
      ORDER BY total DESC
      LIMIT 20
    `);

    // 2. Recent memory entries (brain feed)
    const { rows: recentMemory } = await pool.query(`
      SELECT
        am.id, am.agent_id, am.memory_type, am.key,
        am.value, am.confidence::numeric AS confidence,
        am.memory_tier, am.tags, am.source,
        am.updated_at::text AS updated_at
      FROM agent_memory am
      WHERE am.memory_tier <= 2
      ORDER BY am.updated_at DESC
      LIMIT 30
    `);

    // 3. Agent run history summary
    const { rows: agentRuns } = await pool.query(`
      SELECT DISTINCT ON (agent_id)
        agent_id, status, started_at::text,
        duration_ms, items_processed, errors_count, error_msg
      FROM agent_run_history
      ORDER BY agent_id, started_at DESC
    `);

    // 4. System health metrics
    const { rows: [health] } = await pool.query(`
      SELECT
        (SELECT COUNT(*)::int FROM places WHERE is_visible = true) AS places_total,
        (SELECT COUNT(*)::int FROM places WHERE description IS NOT NULL AND length(description) >= 300) AS places_with_desc,
        (SELECT COUNT(*)::int FROM places WHERE view_count > 0) AS places_with_views,
        (SELECT COUNT(*)::int FROM kamchatka_routes) AS routes_total,
        (SELECT COUNT(*)::int FROM kamchatka_routes WHERE description IS NOT NULL AND length(description) > 100) AS routes_with_desc,
        (SELECT COUNT(*)::int FROM ai_route_images) AS images_total,
        (SELECT COUNT(*)::int FROM agent_memory) AS memory_total,
        (SELECT COUNT(*)::int FROM agent_memory WHERE expires_at IS NOT NULL AND expires_at > NOW()) AS memory_active,
        (SELECT COUNT(*)::int FROM agent_run_history WHERE started_at > NOW() - INTERVAL '24h') AS runs_24h,
        (SELECT COUNT(*)::int FROM agent_run_history WHERE status = 'error' AND started_at > NOW() - INTERVAL '24h') AS errors_24h
    `);

    // 5. Top memory topics by type
    const { rows: memoryTypes } = await pool.query(`
      SELECT memory_type, COUNT(*)::int AS count
      FROM agent_memory
      GROUP BY memory_type
      ORDER BY count DESC
      LIMIT 15
    `);

    // 6. Memory edits (evolution signal)
    const { rows: recentEdits } = await pool.query(`
      SELECT
        me.agent_id, me.edited_by, me.reason,
        me.created_at::text AS created_at,
        am.key, am.memory_type
      FROM agent_memory_edits me
      JOIN agent_memory am ON am.id = me.memory_id
      ORDER BY me.created_at DESC
      LIMIT 20
    `).catch(() => ({ rows: [] }));

    return NextResponse.json({
      health,
      memoryStats,
      recentMemory,
      agentRuns,
      memoryTypes,
      recentEdits,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
