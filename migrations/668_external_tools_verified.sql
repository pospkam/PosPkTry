-- Migration 668: add verified flag to external_tools
-- Verified tools are shown to Kuzmich; unverified tools visible only in admin UI

ALTER TABLE external_tools ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE;

-- All seed tools from migration 666 are considered verified
UPDATE external_tools SET verified = TRUE WHERE source = 'seed';

CREATE INDEX IF NOT EXISTS idx_external_tools_verified ON external_tools(verified) WHERE verified = TRUE;
