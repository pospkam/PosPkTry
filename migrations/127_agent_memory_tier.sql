-- Migration 127: Agent Memory — 3-tier Letta pattern
-- Adds memory_tier, tags, edit tracking to agent_memory
-- Adds agent_memory_edits audit table

-- Add new columns to agent_memory
ALTER TABLE agent_memory
  ADD COLUMN IF NOT EXISTS memory_tier     smallint    NOT NULL DEFAULT 2,
  ADD COLUMN IF NOT EXISTS tags            text[]      NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS source_meeting_id text,
  ADD COLUMN IF NOT EXISTS edit_count      integer     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_edited_at  timestamptz;

-- Index for tier-based recall (tier 1 = core, always in prompt)
CREATE INDEX IF NOT EXISTS idx_agent_memory_tier
  ON agent_memory (agent_id, memory_tier)
  WHERE expires_at IS NULL OR expires_at > NOW();

-- Index for tag-based search
CREATE INDEX IF NOT EXISTS idx_agent_memory_tags
  ON agent_memory USING GIN (tags);

-- Audit table for memory diffs
CREATE TABLE IF NOT EXISTS agent_memory_edits (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  memory_id   uuid        NOT NULL REFERENCES agent_memory(id) ON DELETE CASCADE,
  agent_id    text        NOT NULL,
  old_value   jsonb       NOT NULL,
  new_value   jsonb       NOT NULL,
  edited_by   text,
  reason      text,
  created_at  timestamptz NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_agent_memory_edits_memory_id
  ON agent_memory_edits (memory_id);

CREATE INDEX IF NOT EXISTS idx_agent_memory_edits_agent_id
  ON agent_memory_edits (agent_id, created_at DESC);
