-- Migration 067: Agent Autonomy System
-- Date: 2026-03-22
-- Purpose: Tools registry + action journal for autonomous agent work
-- IDEMPOTENT: safe to run multiple times

BEGIN;

-- 1. Journal of autonomous agent actions
CREATE TABLE IF NOT EXISTS agent_actions (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      VARCHAR(50)  NOT NULL,
  tool_name     VARCHAR(100) NOT NULL,
  permission    VARCHAR(20)  NOT NULL DEFAULT 'auto',
  input         JSONB        NOT NULL DEFAULT '{}',
  output        JSONB        DEFAULT '{}',
  status        VARCHAR(20)  NOT NULL DEFAULT 'pending',
  error_message TEXT,
  approval_id   UUID         REFERENCES agent_approvals(id),
  measured_at   TIMESTAMPTZ,
  measurement   JSONB,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  completed_at  TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_agent_actions_agent
  ON agent_actions(agent_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_actions_status
  ON agent_actions(status)
  WHERE status IN ('pending', 'running');

CREATE INDEX IF NOT EXISTS idx_agent_actions_measure
  ON agent_actions(measured_at)
  WHERE measured_at IS NULL AND status = 'done';

-- 2. Tool registry: which tools each agent has
CREATE TABLE IF NOT EXISTS agent_tools (
  id            UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      VARCHAR(50)  NOT NULL,
  tool_name     VARCHAR(100) NOT NULL,
  description   TEXT         NOT NULL,
  permission    VARCHAR(20)  NOT NULL DEFAULT 'auto',
  cooldown_ms   INTEGER      DEFAULT 0,
  enabled       BOOLEAN      DEFAULT true,
  created_at    TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id, tool_name)
);

COMMIT;
