-- Migration 664: share_token for public trip sharing
-- IDEMPOTENT

BEGIN;

ALTER TABLE user_trips
  ADD COLUMN IF NOT EXISTS share_token UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS is_public BOOLEAN NOT NULL DEFAULT FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_trips_share_token
  ON user_trips(share_token)
  WHERE share_token IS NOT NULL;

COMMIT;
