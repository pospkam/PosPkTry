-- Migration 056: Rebuild v_route_marketplace from operator_tours + fix commission
-- Дата: 2026-03-20
--
-- Проблемы которые исправляет:
--   1. marketplace_score использовал устаревший commission_rate вместо commission_current
--   2. Коммит 042 хранит старую версию view на основе kamchatka_routes + tours
--      (legacy). Продакшн уже работает на operator_tours — фиксируем в migration.
--   3. Добавляем все столбцы, ожидаемые API (tour_duration_hours, price_old, etc.)
--
-- IDEMPOTENT: безопасно запускать повторно.

BEGIN;

-- Добавляем недостающие столбцы в operator_tours (IF NOT EXISTS — идемпотентно)
ALTER TABLE operator_tours
  ADD COLUMN IF NOT EXISTS agent_route_id     BIGINT REFERENCES agent_route_knowledge(id),
  ADD COLUMN IF NOT EXISTS base_price_override DECIMAL(10,2),   -- старая цена (для зачёркивания)
  ADD COLUMN IF NOT EXISTS price_unit         VARCHAR(50) DEFAULT 'per_person',
  ADD COLUMN IF NOT EXISTS difficulty         VARCHAR(50),      -- easy / medium / hard
  ADD COLUMN IF NOT EXISTS rating             NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS review_count       INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS included           TEXT[],
  ADD COLUMN IF NOT EXISTS tour_image         VARCHAR(500);

CREATE INDEX IF NOT EXISTS idx_operator_tours_agent_route ON operator_tours(agent_route_id);

DROP VIEW IF EXISTS v_route_marketplace;

CREATE VIEW v_route_marketplace AS
SELECT
  -- Route / place link
  ark.id                                              AS route_id,
  ark.route_dedupe_key                                AS route_slug,
  ark.title                                           AS route_title,
  ark.category                                        AS route_category,
  ark.description                                     AS route_description,
  ark.lat,
  ark.lng,
  ark.payload                                         AS metadata,

  -- Tour
  ot.id                                               AS tour_id,
  ot.title                                            AS tour_name,
  ot.description                                      AS tour_short_desc,
  ot.tour_image,
  ot.base_price                                       AS tour_price_base,
  ot.base_price_override                              AS price_old,           -- старая цена (для зачёркивания)
  COALESCE(ot.price_unit, 'per_person')               AS price_unit,
  COALESCE(ot.base_price_override, ot.base_price)     AS effective_price,
  ot.duration_hours                                   AS tour_duration_hours,
  ot.duration_type,
  ot.multi_day_count,
  ot.difficulty                                       AS tour_difficulty,
  ot.max_participants                                 AS max_group_size,
  ot.min_participants                                 AS min_group_size,
  COALESCE(ot.rating, 0)                              AS tour_rating,
  COALESCE(ot.review_count, 0)                        AS tour_review_count,
  ot.included,
  ot.season_start,
  ot.season_end,

  -- Operator
  p.id                                                AS operator_id,
  COALESCE(p.company_name, p.name)                    AS operator_name,
  p.slug                                              AS operator_slug,
  p.hero_image                                        AS operator_hero_image,
  COALESCE(p.rating, 0)                               AS operator_rating,
  COALESCE(p.review_count, 0)                         AS operator_review_count,
  COALESCE(p.commission_current, p.commission_rate, 15.00)  AS commission_rate,  -- актуальная ставка
  p.is_verified                                       AS operator_verified,

  -- Next available slot (LATERAL)
  next_slot.date                                      AS next_departure_date,
  next_slot.available_slots                            AS next_departure_slots,
  next_slot.price_override                            AS next_departure_price,

  -- Marketplace ranking score: rating × 70% + commission efficiency × 30%
  (
    COALESCE(ot.rating, 0) * 0.7
    + (1 - COALESCE(p.commission_current, p.commission_rate, 0.15) / 100.0) * 0.3
  )                                                   AS marketplace_score

FROM operator_tours ot
JOIN partners p ON p.id = ot.operator_id
JOIN agent_route_knowledge ark ON ark.id = ot.agent_route_id
LEFT JOIN LATERAL (
  SELECT ta.date, ta.available_slots, ta.price_override
  FROM tour_availability ta
  WHERE ta.operator_tour_id = ot.id
    AND ta.is_cancelled = FALSE
    AND ta.available_slots > COALESCE(ta.booked_slots, 0)
    AND ta.date >= CURRENT_DATE
  ORDER BY ta.date ASC
  LIMIT 1
) next_slot ON TRUE
WHERE ot.is_active  = TRUE
  AND ot.is_published = TRUE
  AND p.is_public   = TRUE;

COMMENT ON VIEW v_route_marketplace IS
  'Marketplace offers: operator_tours joined to agent_route_knowledge.
   marketplace_score uses commission_current (sliding scale) with fallback to commission_rate.
   Replaces legacy kamchatka_routes+tours based view (migration 042).
   Migration 056 — 2026-03-20';

COMMIT;
