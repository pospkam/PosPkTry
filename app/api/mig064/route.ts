/**
 * GET /api/mig064
 * Idempotent migration: creates agent_memory table.
 */

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS agent_memory (
        id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
        agent_id    VARCHAR(50)  NOT NULL,
        memory_type VARCHAR(50)  NOT NULL,
        key         VARCHAR(200) NOT NULL,
        value       JSONB        NOT NULL DEFAULT '{}',
        confidence  NUMERIC(3,2) DEFAULT 1.00,
        source      VARCHAR(100),
        expires_at  TIMESTAMPTZ,
        created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
        UNIQUE(agent_id, memory_type, key)
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_agent_memory_agent
        ON agent_memory(agent_id, memory_type, updated_at DESC)
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_agent_memory_expires
        ON agent_memory(expires_at)
        WHERE expires_at IS NOT NULL
    `);

    return NextResponse.json({ success: true, message: 'Migration 064 applied: agent_memory' });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
