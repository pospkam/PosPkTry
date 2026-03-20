-- Migration 058: user_trips — persisted trip plans from /planner
-- Date: 2026-03-20
--
-- Stores AI-generated and manually edited trip plans per user.
-- days / transport_by_day are JSONB so the schema can evolve without migrations.
-- IDEMPOTENT: safe to run multiple times (IF NOT EXISTS / OR REPLACE)

BEGIN;

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
);

COMMENT ON TABLE user_trips IS 'Saved trip plans from /planner, one per user session/save';
COMMENT ON COLUMN user_trips.days IS 'Array of DayPlan objects: [{day,zone,title,activityType,priceFrom,priceTo,coords,defaultTransport}]';
COMMENT ON COLUMN user_trips.transport_by_day IS 'Map of day number → transport type override: {"1":"jeep","3":"helicopter"}';

CREATE INDEX IF NOT EXISTS idx_user_trips_user_id
  ON user_trips(user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_user_trips_created
  ON user_trips(created_at DESC);

-- Auto-update updated_at on any row change
CREATE OR REPLACE FUNCTION set_user_trips_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_user_trips_updated_at ON user_trips;
CREATE TRIGGER trg_user_trips_updated_at
  BEFORE UPDATE ON user_trips
  FOR EACH ROW EXECUTE FUNCTION set_user_trips_updated_at();

COMMIT;
