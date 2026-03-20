import { NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

// Удаляем дубль Реки Быстрой, созданный seed-ом mig057
export async function GET() {
  const result = await pool.query(`
    DELETE FROM agent_route_knowledge
    WHERE route_dedupe_key = 'reka-bystraya|53.330|157.770'
    RETURNING id, route_dedupe_key
  `);

  const total = await pool.query(
    `SELECT COUNT(*)::int AS n FROM agent_route_knowledge WHERE is_visible = TRUE`
  );

  return NextResponse.json({
    success: true,
    migration: 'cleanup_bystraya_duplicate',
    deleted: result.rowCount,
    total_visible: total.rows[0]?.n ?? 0,
  });
}
