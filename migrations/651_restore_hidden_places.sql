-- migrations/651_restore_hidden_places.sql
--
-- Restore places that were mass-hidden in March 2026.
-- Keep hidden:
--   • rows without a usable description (<50 chars) — need enrichment first
--   • rows without coordinates — need geocoding first
--   • rows that duplicate an already-visible place at the same coords (3-decimal)
--
-- Everything else becomes is_visible=TRUE again.
-- Idempotent.

BEGIN;

WITH visible_coords AS (
  SELECT DISTINCT
    ROUND(lat::numeric, 3) AS la,
    ROUND(lng::numeric, 3) AS ln
  FROM agent_route_knowledge
  WHERE kind = 'place' AND is_visible = TRUE AND lat IS NOT NULL
),
to_restore AS (
  SELECT a.id
  FROM agent_route_knowledge a
  WHERE a.kind = 'place'
    AND a.is_visible = FALSE
    AND a.lat IS NOT NULL AND a.lng IS NOT NULL
    AND a.description IS NOT NULL AND LENGTH(a.description) >= 50
    AND NOT EXISTS (
      SELECT 1 FROM visible_coords v
      WHERE v.la = ROUND(a.lat::numeric, 3)
        AND v.ln = ROUND(a.lng::numeric, 3)
    )
)
UPDATE agent_route_knowledge
   SET is_visible = TRUE,
       updated_at = NOW()
 WHERE id IN (SELECT id FROM to_restore);

COMMIT;
