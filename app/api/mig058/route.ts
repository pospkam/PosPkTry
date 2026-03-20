/**
 * GET /api/mig058
 * Idempotent migration: creates user_trips table.
 * Run once after deploy. Listed in PUBLIC_API_ROUTES.
 */

import { NextResponse } from 'next/server';
import { pool } from '@/lib/db-pool';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS user_trips (
        id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id          UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title            VARCHAR(255) NOT NULL DEFAULT 'Мой маршрут',
        arrival_date     DATE,
        departure_date   DATE,
        places           TEXT[]   NOT NULL DEFAULT '{}',
        activities       TEXT[]   NOT NULL DEFAULT '{}',
        days             JSONB    NOT NULL DEFAULT '[]',
        transport_by_day JSONB    NOT NULL DEFAULT '{}',
        deleted_at       TIMESTAMPTZ,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_user_trips_user_id
        ON user_trips(user_id)
        WHERE deleted_at IS NULL
    `);

    await pool.query(`
      CREATE OR REPLACE FUNCTION set_user_trips_updated_at()
      RETURNS TRIGGER LANGUAGE plpgsql AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$
    `);

    await pool.query(`
      DROP TRIGGER IF EXISTS trg_user_trips_updated_at ON user_trips
    `);

    await pool.query(`
      CREATE TRIGGER trg_user_trips_updated_at
        BEFORE UPDATE ON user_trips
        FOR EACH ROW EXECUTE FUNCTION set_user_trips_updated_at()
    `);

    return NextResponse.json({ success: true, message: 'Migration 058 applied: user_trips table ready' });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Ошибка миграции';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
