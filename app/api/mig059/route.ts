/**
 * GET /api/mig059
 * Idempotent migration: creates ai_actions_log table.
 */

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS ai_actions_log (
        id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        action_type VARCHAR(100) NOT NULL,
        provider    VARCHAR(50),
        tokens_in   INTEGER,
        tokens_out  INTEGER,
        cost_usd    NUMERIC(10,6),
        metadata    JSONB        NOT NULL DEFAULT '{}',
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_actions_log_type_time
        ON ai_actions_log(action_type, created_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_ai_actions_log_route
        ON ai_actions_log((metadata->>'route_id'))
        WHERE action_type = 'kuzmich_post'
    `);

    return NextResponse.json({ success: true, message: 'Migration 059 applied: ai_actions_log ready' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ошибка миграции';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
