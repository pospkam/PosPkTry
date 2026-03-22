-- Migration: Add category column to tours
-- Date: 2025-11-14

ALTER TABLE tours
  ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'adventure';

UPDATE tours
SET category = 'adventure'
WHERE category IS NULL;

CREATE INDEX IF NOT EXISTS idx_tours_category ON tours(category);
