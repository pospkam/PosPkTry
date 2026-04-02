-- Migration 121: Guide -> Operator link
-- IDEMPOTENT

BEGIN;

ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS guide_operator_id BIGINT REFERENCES partners(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_partners_guide_operator
  ON partners(guide_operator_id)
  WHERE guide_operator_id IS NOT NULL;

UPDATE operator_tours
SET is_published = TRUE
WHERE slug = 'bystraya-river-rafting'
  AND is_published = FALSE;

COMMIT;
