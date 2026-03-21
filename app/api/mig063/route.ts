/**
 * GET /api/mig063
 * Применяет migration 063: agent_experiments + agent_approvals tables.
 * Вызывается один раз из Telegram /migrate или вручную.
 */

import { NextResponse } from 'next/server';
import { query } from '@/lib/database';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS agent_experiments (
        id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
        name        VARCHAR(200) NOT NULL,
        description TEXT,
        intent      VARCHAR(100),
        variant_a   JSONB        NOT NULL DEFAULT '{}',
        variant_b   JSONB        NOT NULL DEFAULT '{}',
        metric      VARCHAR(50)  NOT NULL DEFAULT 'success_rate',
        status      VARCHAR(20)  NOT NULL DEFAULT 'running'
                      CHECK (status IN ('running','paused','completed')),
        winner      VARCHAR(10)  CHECK (winner IN ('a','b','tie')),
        results     JSONB        NOT NULL DEFAULT '{}',
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_agent_experiments_status
        ON agent_experiments(status, intent)
    `);

    await query(`
      CREATE TABLE IF NOT EXISTS agent_approvals (
        id           UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        action_type  VARCHAR(100) NOT NULL,
        description  TEXT,
        context      JSONB        NOT NULL DEFAULT '{}',
        status       VARCHAR(20)  NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending','approved','rejected','expired')),
        requested_by VARCHAR(100),
        reviewed_by  INTEGER      REFERENCES users(id),
        reviewed_at  TIMESTAMPTZ,
        review_notes TEXT,
        expires_at   TIMESTAMPTZ,
        created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
      )
    `);

    await query(`
      CREATE INDEX IF NOT EXISTS idx_agent_approvals_status
        ON agent_approvals(status, created_at DESC)
    `);

    return NextResponse.json({ success: true, message: 'Migration 063 applied: agent_experiments + agent_approvals' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
