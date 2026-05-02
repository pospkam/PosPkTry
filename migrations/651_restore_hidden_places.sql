-- migrations/651_restore_hidden_places.sql
--
-- Restore places that were mass-hidden in March 2026.
-- Keep hidden:
--   • rows without a usable description (<50 chars) — need enrichment first
--   • rows that duplicate an already-visible place at the same coords (3-decimal)
--
-- Everything else becomes is_visible=TRUE again.
-- Idempotent. Targets places table (agent_route_knowledge is a VIEW).

BEGIN;

WITH visible_coords AS (
  SELECT DISTINCT
    ROUND(lat::numeric, 3) AS la,
    ROUND(lng::numeric, 3) AS ln
  FROM places
  WHERE is_visible = TRUE
),
to_restore AS (
  SELECT p.ark_id
  FROM places p
  WHERE p.is_visible = FALSE
    AND p.description IS NOT NULL AND LENGTH(p.description) >= 50
    AND NOT EXISTS (
      SELECT 1 FROM visible_coords v
      WHERE v.la = ROUND(p.lat::numeric, 3)
        AND v.ln = ROUND(p.lng::numeric, 3)
    )
)
UPDATE places
   SET is_visible = TRUE,
       updated_at = NOW()
 WHERE ark_id IN (SELECT ark_id FROM to_restore);

COMMIT;
