-- Migration 056: operator_tours — недостающие колонки + v_route_marketplace
-- Дата: 2026-03-20 (исправлено: agent_route_id UUID, добавлены все колонки createTour)
--
-- Проблемы которые исправляет:
--   1. operator_tours не имеет ~10 колонок, которые createTour пытается INSERT —
--      любое создание тура через UI падало с "column X does not exist"
--   2. agent_route_id был BIGINT — несовместим с UUID PK в agent_route_knowledge
--   3. base_price_override → переименован в price_old (код использует price_old)
--   4. Пересобирается v_route_marketplace из operator_tours + agent_route_knowledge
--
-- IDEMPOTENT: безопасно запускать повторно (IF NOT EXISTS везде)

BEGIN;

-- ============================================================================
-- 1. ДОБАВЛЯЕМ ВСЕ НЕДОСТАЮЩИЕ КОЛОНКИ В operator_tours
-- ============================================================================

-- Базовое описание
ALTER TABLE operator_tours
  ADD COLUMN IF NOT EXISTS short_description VARCHAR(500);

-- Цена "до скидки" (зачёркнутая цена в UI)
ALTER TABLE operator_tours
  ADD COLUMN IF NOT EXISTS price_old DECIMAL(10,2);

-- Единица цены: per_tour / per_person / per_day_per_person
ALTER TABLE operator_tours
  ADD COLUMN IF NOT EXISTS price_unit VARCHAR(50) DEFAULT 'per_person';

-- Сложность маршрута
ALTER TABLE operator_tours
  ADD COLUMN IF NOT EXISTS difficulty VARCHAR(50);

-- Что включено / что не включено / что взять с собой
ALTER TABLE operator_tours
  ADD COLUMN IF NOT EXISTS included      TEXT[],
  ADD COLUMN IF NOT EXISTS not_included  TEXT[],
  ADD COLUMN IF NOT EXISTS what_to_bring TEXT[];

-- Фотографии тура (массив URL)
ALTER TABLE operator_tours
  ADD COLUMN IF NOT EXISTS photos TEXT[];

-- Главное изображение тура
ALTER TABLE operator_tours
  ADD COLUMN IF NOT EXISTS tour_image VARCHAR(500);

-- Ссылка на место в agent_route_knowledge (UUID — правильный тип!)
ALTER TABLE operator_tours
  ADD COLUMN IF NOT EXISTS agent_route_id UUID REFERENCES agent_route_knowledge(id) ON DELETE SET NULL;

-- Рейтинг и количество отзывов
ALTER TABLE operator_tours
  ADD COLUMN IF NOT EXISTS rating       NUMERIC(3,2),
  ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0;

-- ============================================================================
-- 2. ИНДЕКСЫ
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_operator_tours_agent_route
  ON operator_tours(agent_route_id)
  WHERE agent_route_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_operator_tours_difficulty
  ON operator_tours(difficulty);

CREATE INDEX IF NOT EXISTS idx_operator_tours_price
  ON operator_tours(base_price);

-- ============================================================================
-- 3. ПЕРЕСОБИРАЕМ v_route_marketplace
--    Источник: operator_tours → agent_route_knowledge (вместо устаревшего
--    kamchatka_routes + tours из migration 042)
-- ============================================================================

DROP VIEW IF EXISTS v_route_marketplace;

CREATE VIEW v_route_marketplace AS
SELECT
  -- Место (agent_route_knowledge)
  ark.id                                              AS route_id,
  ark.route_dedupe_key                                AS route_slug,
  ark.title                                           AS route_title,
  ark.category                                        AS route_category,
  ark.description                                     AS route_description,
  ark.lat,
  ark.lng,
  ark.payload                                         AS metadata,

  -- Тур (operator_tours)
  ot.id                                               AS tour_id,
  ot.title                                            AS tour_name,
  COALESCE(ot.short_description, ot.description)      AS tour_short_desc,
  ot.tour_image,
  ot.base_price                                       AS tour_price_base,
  ot.price_old,
  COALESCE(ot.price_unit, 'per_person')               AS price_unit,
  COALESCE(ot.price_old, ot.base_price)               AS effective_price,
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

  -- Оператор (partners)
  p.id                                                AS operator_id,
  COALESCE(p.company_name, p.name)                    AS operator_name,
  p.slug                                              AS operator_slug,
  p.hero_image                                        AS operator_hero_image,
  COALESCE(p.rating, 0)                               AS operator_rating,
  COALESCE(p.review_count, 0)                         AS operator_review_count,
  COALESCE(p.commission_current, p.commission_rate, 15.00) AS commission_rate,
  p.is_verified                                       AS operator_verified,

  -- Ближайший доступный слот (LATERAL)
  next_slot.date                                      AS next_departure_date,
  next_slot.available_slots                            AS next_departure_slots,
  next_slot.price_override                            AS next_departure_price,

  -- Скоринг: рейтинг × 70% + эффективность комиссии × 30%
  (
    COALESCE(ot.rating, 0) * 0.7
    + (1.0 - COALESCE(p.commission_current, p.commission_rate, 0.15) / 100.0) * 0.3
  )                                                   AS marketplace_score

FROM operator_tours ot
JOIN partners p       ON p.id = ot.operator_id
JOIN agent_route_knowledge ark ON ark.id = ot.agent_route_id
LEFT JOIN LATERAL (
  SELECT ta.date, ta.available_slots, ta.base_price_override AS price_override
  FROM tour_availability ta
  WHERE ta.operator_tour_id = ot.id
    AND ta.is_cancelled   = FALSE
    AND ta.available_slots > COALESCE(ta.booked_slots, 0)
    AND ta.date >= CURRENT_DATE
  ORDER BY ta.date ASC
  LIMIT 1
) next_slot ON TRUE
WHERE ot.is_active    = TRUE
  AND ot.is_published = TRUE
  AND ot.deleted_at   IS NULL
  AND p.is_public     = TRUE;

COMMENT ON VIEW v_route_marketplace IS
  'Marketplace: operator_tours → agent_route_knowledge.
   Исправлено в migration 056 (2026-03-20):
   - agent_route_id UUID (было BIGINT — несовместимо с UUID PK)
   - добавлены все колонки createTour: price_old, short_description, included,
     not_included, what_to_bring, photos, tour_image, difficulty
   - commission_current с fallback на commission_rate';

COMMIT;
