-- Migration 143: agent_run_history
-- Audit trail for cron agent runs — shows what ran, when, how long, what failed.

CREATE TABLE IF NOT EXISTS agent_run_history (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      VARCHAR(50)  NOT NULL,
  status        VARCHAR(20)  NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  started_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  ended_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  duration_ms   INT,
  items_processed INT,
  items_created   INT,
  errors_count    INT         NOT NULL DEFAULT 0,
  error_msg       TEXT,
  metadata        JSONB,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_run_history_agent_id
  ON agent_run_history (agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_run_history_status
  ON agent_run_history (status, created_at DESC);
