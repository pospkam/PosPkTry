-- Migration 0647: Agent Memory Tiers (Letta pattern)
-- Date: 2026-04-05
-- Purpose: 3-tier memory (core/archival/recall) + diff tracking + tags
-- Pattern: Letta — stateful agents with advanced memory
-- IDEMPOTENT: safe to run multiple times

BEGIN;

-- Tier column: 1=core (always in prompt), 2=archival (semantic search), 3=recall (recent history)
ALTER TABLE agent_memory ADD COLUMN IF NOT EXISTS memory_tier SMALLINT DEFAULT 2;
ALTER TABLE agent_memory ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';
ALTER TABLE agent_memory ADD COLUMN IF NOT EXISTS edit_count INT DEFAULT 0;
ALTER TABLE agent_memory ADD COLUMN IF NOT EXISTS last_edited_at TIMESTAMPTZ;
ALTER TABLE agent_memory ADD COLUMN IF NOT EXISTS source_meeting_id TEXT;

-- Memory change audit trail (diff tracking)
CREATE TABLE IF NOT EXISTS agent_memory_edits (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id   UUID         REFERENCES agent_memory(id) ON DELETE CASCADE,
  agent_id    VARCHAR(50)  NOT NULL,
  old_value   JSONB,
  new_value   JSONB        NOT NULL,
  edited_by   VARCHAR(50)  NOT NULL,
  reason      TEXT,
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Core memory: compiled system prompt per agent (materialized once per session)
CREATE TABLE IF NOT EXISTS agent_core_memory (
  id          UUID         PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    VARCHAR(50)  NOT NULL UNIQUE,
  compiled_prompt TEXT     NOT NULL DEFAULT '',
  core_items  JSONB        NOT NULL DEFAULT '[]',
  compiled_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  valid_until TIMESTAMPTZ
);

-- Indexes for tier-based queries
CREATE INDEX IF NOT EXISTS idx_agent_memory_tier
  ON agent_memory(agent_id, memory_tier, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_agent_memory_tags
  ON agent_memory USING gin(tags)
  WHERE tags != '{}';

CREATE INDEX IF NOT EXISTS idx_agent_memory_edits_agent
  ON agent_memory_edits(agent_id, created_at DESC);

COMMIT;
