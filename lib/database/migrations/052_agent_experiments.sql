/**
 * Migration 052: agent_experiments
 *
 * Stores A/B test experiments and their control/treatment groups
 * Used for tracking pricing tests, UI variations, etc
 */

CREATE TABLE IF NOT EXISTS agent_experiments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  status VARCHAR(50) DEFAULT 'active',
  control_group JSONB NOT NULL DEFAULT '[]'::jsonb,
  treatment_group JSONB NOT NULL DEFAULT '[]'::jsonb,
  start_date TIMESTAMP DEFAULT NOW(),
  end_date TIMESTAMP,
  primary_metric VARCHAR(100),
  results JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_agent_experiments_status ON agent_experiments(status);
CREATE INDEX idx_agent_experiments_type ON agent_experiments(type);
CREATE INDEX idx_agent_experiments_dates ON agent_experiments(start_date, end_date);

-- Add column to operator_tours for experiment tracking
ALTER TABLE operator_tours ADD COLUMN IF NOT EXISTS ab_test_id UUID REFERENCES agent_experiments(id);
ALTER TABLE operator_tours ADD COLUMN IF NOT EXISTS ab_test_variant VARCHAR(50);
