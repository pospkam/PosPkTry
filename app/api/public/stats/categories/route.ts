/**
 * GET /api/public/stats/categories
 *
 * Количество маршрутов по каждой категории (is_visible = TRUE).
 */

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const result = await pool.query(
      `SELECT category, COUNT(*)::int AS cnt
       FROM agent_route_knowledge
       WHERE is_visible = TRUE
       GROUP BY category
       ORDER BY cnt DESC`,
    );

    const counts: Record<string, number> = {};
    for (const row of result.rows) {
      counts[row.category] = row.cnt;
    }

    return NextResponse.json({ success: true, data: counts });
  } catch {
    return NextResponse.json({ success: true, data: {} });
  }
}
