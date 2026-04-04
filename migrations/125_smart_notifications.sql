-- Migration 125: Smart notifications log table
-- Tracks notifications sent to tourists about new tours matching their preferences.
-- Rate-limited to 1 notification per user per 24h.

CREATE TABLE IF NOT EXISTS smart_notifications_log (
  id          BIGSERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL,
  tours_matched INTEGER[] NOT NULL DEFAULT '{}',
  channel     VARCHAR(20) NOT NULL DEFAULT 'telegram',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_smart_notify_user_time
  ON smart_notifications_log(user_id, created_at DESC);
