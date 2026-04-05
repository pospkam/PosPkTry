-- Migration 086: Add retry_count to agent_approvals
-- Auto-retry policy for failed initiatives (max 2 attempts)
-- Wishlist #3

ALTER TABLE agent_approvals
  ADD COLUMN IF NOT EXISTS retry_count INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN agent_approvals.retry_count IS 'Число автоматических повторных попыток исполнения (max 2)';
