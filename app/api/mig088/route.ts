/**
 * GET /api/mig088?secret=<CRON_SECRET>
 * One-time migration: fix lead tour ID column types (UUID → TEXT)
 * DELETE THIS FILE after successful run.
 */
import { NextRequest, NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret');
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await pool.query(`ALTER TABLE lead_proposals DROP CONSTRAINT IF EXISTS lead_proposals_primary_tour_id_fkey`);
    await pool.query(`ALTER TABLE leads ALTER COLUMN matched_tour_ids TYPE TEXT[] USING matched_tour_ids::TEXT[]`);
    await pool.query(`ALTER TABLE lead_proposals ALTER COLUMN primary_tour_id TYPE TEXT USING primary_tour_id::TEXT`);
    await pool.query(`ALTER TABLE lead_proposals ALTER COLUMN alt_tour_ids TYPE TEXT[] USING alt_tour_ids::TEXT[]`);

    return NextResponse.json({ ok: true, message: 'Migration 088 applied — delete this endpoint' });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  }
}
