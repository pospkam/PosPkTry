-- Migration 064: Agent Memory -- persistent cross-run knowledge
-- Date: 2026-03-21
-- Purpose: Agents remember insights, learned patterns, prompt improvements across invocations
-- IDEMPOTENT: safe to run multiple times

BEGIN;

-- Persistent agent memory: insights, learned patterns, prompt improvements
CREATE TABLE IF NOT EXISTS agent_memory (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    VARCHAR(50)  NOT NULL,          -- 'evo', 'admin', 'hacker', etc.
  memory_type VARCHAR(50)  NOT NULL,          -- 'insight', 'prompt_patch', 'pattern', 'decision'
  key         VARCHAR(200) NOT NULL,          -- unique within agent+type
  value       JSONB        NOT NULL DEFAULT '{}',
  confidence  NUMERIC(3,2) DEFAULT 1.00,      -- 0.00-1.00
  source      VARCHAR(100),                   -- 'self_optimize', 'feedback', 'experiment', 'board_meeting'
  expires_at  TIMESTAMPTZ,                    -- optional TTL for auto-cleanup
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  UNIQUE(agent_id, memory_type, key)
);

CREATE INDEX IF NOT EXISTS idx_agent_memory_agent
  ON agent_memory(agent_id, memory_type, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_memory_expires
  ON agent_memory(expires_at)
  WHERE expires_at IS NOT NULL;

-- Migration apply endpoint
-- GET /api/mig064

COMMIT;
