-- Migration 120: track SDK agentic loop sessions
-- Stores per-run telemetry for A/B comparison: classic vs SDK agents

CREATE TABLE IF NOT EXISTS agent_sdk_sessions (
  id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id         TEXT        NOT NULL,
  intent           TEXT        NOT NULL,
  variant          TEXT        NOT NULL DEFAULT 'classic'
                               CHECK (variant IN ('classic', 'sdk')),
  experiment_id    UUID        REFERENCES agent_experiments(id) ON DELETE SET NULL,
  tool_calls_count INTEGER     NOT NULL DEFAULT 0,
  iterations       INTEGER     NOT NULL DEFAULT 0,
  input_tokens     INTEGER,
  output_tokens    INTEGER,
  duration_ms      INTEGER,
  outcome          TEXT        CHECK (outcome IN ('success', 'fail', 'timeout')),
  final_response   TEXT,
  tool_calls_log   JSONB       NOT NULL DEFAULT '[]',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS agent_sdk_sessions_agent_idx      ON agent_sdk_sessions(agent_id);
CREATE INDEX IF NOT EXISTS agent_sdk_sessions_intent_idx     ON agent_sdk_sessions(intent);
CREATE INDEX IF NOT EXISTS agent_sdk_sessions_variant_idx    ON agent_sdk_sessions(variant);
CREATE INDEX IF NOT EXISTS agent_sdk_sessions_exp_idx        ON agent_sdk_sessions(experiment_id);
CREATE INDEX IF NOT EXISTS agent_sdk_sessions_created_idx    ON agent_sdk_sessions(created_at DESC);
