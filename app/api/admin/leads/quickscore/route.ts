/**
 * POST /api/admin/leads/quickscore
 * Быстрый rule-based скоринг лидов без AI (ai_score IS NULL)
 * Не требует AI провайдера — мгновенно
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth/middleware';
import { pool } from '@/lib/db-pool';
import { computeQuickScore } from '@/lib/leads/scoring';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const authResult = await requireAdmin(req);
  if (authResult instanceof NextResponse) return authResult;

  const unscored = await pool.query<{
    id: string; name: string; phone: string;
    comment: string | null; source_data: Record<string, unknown> | null;
  }>(
    `SELECT id, name, phone, comment, source_data
     FROM leads WHERE ai_score IS NULL ORDER BY created_at DESC LIMIT 100`
  );

  if (unscored.rows.length === 0) {
    return NextResponse.json({ updated: 0, message: 'Все лиды уже оценены' });
  }

  let updated = 0;
  for (const row of unscored.rows) {
    const score = computeQuickScore(row.name, row.phone, row.comment, row.source_data);
    await pool.query(`UPDATE leads SET ai_score = $1 WHERE id = $2`, [score, row.id]);
    updated++;
  }

  return NextResponse.json({ updated, message: `Обновлено ${updated} лидов` });
}
