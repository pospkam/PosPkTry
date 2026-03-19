-- Migration 042: tour_image в таблице tours + обновление v_route_marketplace
-- Дата: 2026-03-19

-- 1. Добавить колонку tour_image в tours
ALTER TABLE tours ADD COLUMN IF NOT EXISTS tour_image TEXT;

-- 2. Пересоздать v_route_marketplace с tour_image и operator_hero_image
DROP VIEW IF EXISTS v_route_marketplace;

CREATE VIEW v_route_marketplace AS
SELECT
  r.id                          AS route_id,
  r.slug                        AS route_slug,
  r.title                       AS route_title,
  r.category                    AS route_category,
  r.description                 AS route_description,
  r.lat,
  r.lng,
  r.metadata,
  t.id                          AS tour_id,
  t.name                        AS tour_name,
  t.short_description           AS tour_short_desc,
  t.tour_image,
  t.price                       AS tour_price_base,
  t.duration                    AS tour_duration_days,
  t.difficulty                  AS tour_difficulty,
  t.max_group_size,
  t.min_group_size,
  t.rating                      AS tour_rating,
  t.review_count                AS tour_review_count,
  t.included,
  t.season,
  p.id                          AS operator_id,
  p.name                        AS operator_name,
  p.slug                        AS operator_slug,
  p.hero_image                  AS operator_hero_image,
  p.rating                      AS operator_rating,
  p.review_count                AS operator_review_count,
  p.commission_rate,
  p.is_verified                 AS operator_verified,
  next_dep.start_date           AS next_departure_date,
  next_dep.available_slots      AS next_departure_slots,
  next_dep.price_override       AS next_departure_price,
  COALESCE(next_dep.price_override, t.price) AS effective_price,
  (COALESCE(t.rating, 0) * 0.7 + COALESCE(p.commission_rate, 0) * 30 * 0.3) AS marketplace_score
FROM kamchatka_routes r
JOIN tours t ON t.route_id = r.id AND t.is_active = TRUE
JOIN partners p ON p.id = t.operator_id
LEFT JOIN LATERAL (
  SELECT d.start_date, d.available_slots, d.price_override
  FROM tour_departures d
  WHERE d.tour_id = t.id
    AND d.status = 'active'
    AND d.available_slots > d.booked_slots
    AND d.start_date >= CURRENT_DATE
  ORDER BY d.start_date
  LIMIT 1
) next_dep ON TRUE
ORDER BY r.id, marketplace_score DESC;
