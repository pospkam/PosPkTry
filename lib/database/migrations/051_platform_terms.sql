/**
 * Migration 051: platform_terms
 *
 * Stores versioned platform terms (T&C, weather policies, etc)
 * Immutable storage - each version is preserved
 */

CREATE TABLE IF NOT EXISTS platform_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type VARCHAR(50) NOT NULL,
  content TEXT NOT NULL,
  version INTEGER DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_platform_terms_type_version ON platform_terms(type, version DESC);

-- Seed initial weather policy v0 (for reference)
INSERT INTO platform_terms (type, content, version)
VALUES (
  'weather_policy',
  'Original weather policy: Tours may be cancelled due to severe weather. Refund or reschedule available.',
  0
) ON CONFLICT DO NOTHING;
