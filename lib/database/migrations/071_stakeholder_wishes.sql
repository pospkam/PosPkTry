-- Migration 071: Stakeholder wishes (chat for Artem / MCHS coordinator)
-- Stores wishes/requests from key stakeholders for tracking and implementation

CREATE TABLE IF NOT EXISTS stakeholder_wishes (
  id            BIGSERIAL PRIMARY KEY,
  stakeholder   VARCHAR(100) NOT NULL,       -- 'artem', 'mchs', etc.
  message       TEXT NOT NULL,
  category      VARCHAR(50) DEFAULT 'general', -- 'feature', 'bug', 'safety', 'general'
  priority      VARCHAR(20) DEFAULT 'medium',  -- 'high', 'medium', 'low'
  status        VARCHAR(20) DEFAULT 'new'      -- 'new', 'reviewed', 'in_progress', 'done', 'rejected'
    CHECK (status IN ('new', 'reviewed', 'in_progress', 'done', 'rejected')),
  admin_reply   TEXT,
  created_by    INT REFERENCES users(id),
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_wishes_stakeholder ON stakeholder_wishes(stakeholder);
CREATE INDEX IF NOT EXISTS idx_wishes_status ON stakeholder_wishes(status);
