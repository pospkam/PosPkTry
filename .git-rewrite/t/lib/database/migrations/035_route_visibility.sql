-- Migration 035: Route visibility control + fix Kamchatskaya Rybalka operator_id
-- Date: 2026-03-14

-- ============================================================
-- 1. Add is_visible to agent_route_knowledge (default FALSE = all hidden)
-- ============================================================
ALTER TABLE agent_route_knowledge
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS idx_ark_visible
  ON agent_route_knowledge (is_visible) WHERE is_visible = TRUE;

-- ============================================================
-- 2. Fix Kamchatskaya Rybalka tours: set operator_id where missing
-- ============================================================
DO $$
DECLARE
  kr_partner_id uuid;
BEGIN
  SELECT id INTO kr_partner_id
    FROM partners
    WHERE slug = 'kamchatskaya-rybalka'
    LIMIT 1;

  IF kr_partner_id IS NOT NULL THEN
    UPDATE tours
    SET operator_id = kr_partner_id, updated_at = NOW()
    WHERE route_id IS NOT NULL
      AND operator_id IS NULL
      AND category IN ('rybalka', 'fishing', 'combo');

    UPDATE tours
    SET is_active = TRUE, updated_at = NOW()
    WHERE operator_id = kr_partner_id;
  END IF;
END $$;

-- ============================================================
-- 3. Deactivate ALL tours NOT belonging to Kamchatskaya Rybalka
-- ============================================================
UPDATE tours
SET is_active = FALSE, updated_at = NOW()
WHERE operator_id IS NULL
   OR operator_id NOT IN (
     SELECT id FROM partners WHERE slug = 'kamchatskaya-rybalka'
   );

-- ============================================================
-- 4. Make visible ONLY routes linked to active KR tours
-- ============================================================
UPDATE agent_route_knowledge ark
SET is_visible = TRUE
FROM tours t
JOIN partners p ON p.id = t.operator_id AND p.slug = 'kamchatskaya-rybalka'
WHERE t.route_id = ark.route_id
  AND t.is_active = TRUE
  AND ark.route_id IS NOT NULL;

-- ============================================================
-- 5. Recreate v_route_marketplace (unchanged structure)
-- ============================================================
DROP VIEW IF EXISTS v_route_marketplace;

CREATE VIEW v_route_marketplace AS
SELECT
  r.id                              AS route_id,
  r.slug                            AS route_slug,
  r.title                           AS route_title,
  r.category                        AS route_category,
  r.description                     AS route_description,
  r.lat,
  r.lng,
  r.metadata,

  t.id                              AS tour_id,
  t.name                            AS tour_name,
  t.short_description               AS tour_short_desc,
  t.price                           AS tour_price_base,
  t.duration                        AS tour_duration_days,
  t.difficulty                      AS tour_difficulty,
  t.max_group_size,
  t.min_group_size,
  t.rating                          AS tour_rating,
  t.review_count                    AS tour_review_count,
  t.included,
  t.season,

  p.id                              AS operator_id,
  p.name                            AS operator_name,
  p.slug                            AS operator_slug,
  p.rating                          AS operator_rating,
  p.review_count                    AS operator_review_count,
  p.commission_rate,
  p.is_verified                     AS operator_verified,

  next_dep.start_date               AS next_departure_date,
  next_dep.available_slots          AS next_departure_slots,
  next_dep.price_override           AS next_departure_price,
  COALESCE(next_dep.price_override, t.price) AS effective_price,

  (COALESCE(t.rating, 0) * 0.7 + COALESCE(p.commission_rate, 0) * 30 * 0.3) AS marketplace_score

FROM kamchatka_routes r
JOIN tours t ON t.route_id = r.id AND t.is_active = true
JOIN partners p ON p.id = t.operator_id
LEFT JOIN LATERAL (
  SELECT d.start_date, d.available_slots, d.price_override
  FROM tour_departures d
  WHERE d.tour_id = t.id
    AND d.status = 'active'
    AND d.available_slots > d.booked_slots
    AND d.start_date >= CURRENT_DATE
  ORDER BY d.start_date ASC
  LIMIT 1
) next_dep ON true

ORDER BY r.id, marketplace_score DESC;

COMMENT ON VIEW v_route_marketplace IS
  'Location-first marketplace: route -> operator offers -> next departure. Sorted by rating+commission score.';
