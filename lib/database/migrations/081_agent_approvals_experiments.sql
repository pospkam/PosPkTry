-- Migration 063: Agent Learning Layer
-- A/B experiments + ApprovalRequired queue
-- Date: 2026-03-21
-- IDEMPOTENT: safe to run multiple times

BEGIN;

-- A/B эксперименты для агентных промптов
CREATE TABLE IF NOT EXISTS agent_experiments (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        VARCHAR(200) NOT NULL,
  description TEXT,
  intent      VARCHAR(100),  -- таргетируемый intent
  variant_a   JSONB        NOT NULL DEFAULT '{}',  -- контроль
  variant_b   JSONB        NOT NULL DEFAULT '{}',  -- challenger
  metric      VARCHAR(50)  NOT NULL DEFAULT 'success_rate',
  status      VARCHAR(20)  NOT NULL DEFAULT 'running'
                CHECK (status IN ('running','paused','completed')),
  winner      VARCHAR(10)  CHECK (winner IN ('a','b','tie')),
  results     JSONB        NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_experiments_status
  ON agent_experiments(status, intent);

-- Действия требующие одобрения администратора
CREATE TABLE IF NOT EXISTS agent_approvals (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type  VARCHAR(100) NOT NULL,
  description  TEXT,
  context      JSONB        NOT NULL DEFAULT '{}',
  status       VARCHAR(20)  NOT NULL DEFAULT 'pending'
                 CHECK (status IN ('pending','approved','rejected','expired')),
  requested_by VARCHAR(100),  -- agent_name или user_id
  reviewed_by  INTEGER      REFERENCES users(id),
  reviewed_at  TIMESTAMPTZ,
  review_notes TEXT,
  expires_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_approvals_status
  ON agent_approvals(status, created_at DESC);

COMMIT;
