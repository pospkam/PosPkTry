-- Migration 034: Route Marketplace
-- Adds slug to routes, commission_rate to partners, marketplace view
-- Date: 2026-03-14

-- ============================================================
-- 1. Transliteration function (RU → latin slug)
-- ============================================================
CREATE OR REPLACE FUNCTION slugify_ru(input text)
RETURNS text AS $$
DECLARE
  result text;
BEGIN
  result := lower(trim(input));
  result := replace(result, 'щ', 'shch');
  result := replace(result, 'ш', 'sh');
  result := replace(result, 'ч', 'ch');
  result := replace(result, 'ж', 'zh');
  result := replace(result, 'ю', 'yu');
  result := replace(result, 'я', 'ya');
  result := replace(result, 'ё', 'yo');
  result := replace(result, 'ъ', '');
  result := replace(result, 'ь', '');
  result := replace(result, 'а', 'a');
  result := replace(result, 'б', 'b');
  result := replace(result, 'в', 'v');
  result := replace(result, 'г', 'g');
  result := replace(result, 'д', 'd');
  result := replace(result, 'е', 'e');
  result := replace(result, 'з', 'z');
  result := replace(result, 'и', 'i');
  result := replace(result, 'й', 'y');
  result := replace(result, 'к', 'k');
  result := replace(result, 'л', 'l');
  result := replace(result, 'м', 'm');
  result := replace(result, 'н', 'n');
  result := replace(result, 'о', 'o');
  result := replace(result, 'п', 'p');
  result := replace(result, 'р', 'r');
  result := replace(result, 'с', 's');
  result := replace(result, 'т', 't');
  result := replace(result, 'у', 'u');
  result := replace(result, 'ф', 'f');
  result := replace(result, 'х', 'kh');
  result := replace(result, 'ц', 'ts');
  result := replace(result, 'э', 'e');
  result := replace(result, 'ы', 'y');
  result := replace(result, 'і', 'i');
  -- Replace spaces and non-alphanumeric with dash
  result := regexp_replace(result, '[^a-z0-9]+', '-', 'g');
  -- Remove leading/trailing dashes
  result := trim(both '-' from result);
  RETURN result;
END;
$$ LANGUAGE plpgsql IMMUTABLE;


-- ============================================================
-- 2. Add slug to kamchatka_routes
-- ============================================================
ALTER TABLE kamchatka_routes
  ADD COLUMN IF NOT EXISTS slug text;

-- Populate slugs from titles (ensure uniqueness by appending category suffix if clash)
UPDATE kamchatka_routes
SET slug = slugify_ru(title)
WHERE slug IS NULL;

-- Fix collisions by appending -ID suffix
UPDATE kamchatka_routes r1
SET slug = slugify_ru(r1.title) || '-' || substr(r1.id::text, 1, 8)
WHERE EXISTS (
  SELECT 1 FROM kamchatka_routes r2
  WHERE r2.id <> r1.id AND r2.slug = slugify_ru(r1.title)
);

ALTER TABLE kamchatka_routes
  ADD CONSTRAINT kamchatka_routes_slug_unique UNIQUE (slug);

CREATE INDEX IF NOT EXISTS idx_kamchatka_routes_slug ON kamchatka_routes(slug);


-- ============================================================
-- 3. Add commission_rate to partners
-- ============================================================
ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS commission_rate numeric(5,4) NOT NULL DEFAULT 0.15,
  ADD COLUMN IF NOT EXISTS commission_rules jsonb DEFAULT '{}'::jsonb;


-- ============================================================
-- 4. Fix duplicate partner (Камчатская рыбалка — keep slug one, re-point tours)
-- ============================================================
DO $$
DECLARE
  keep_id uuid;
  drop_id uuid;
BEGIN
  SELECT id INTO keep_id FROM partners WHERE slug = 'kamchatskaya-rybalka' LIMIT 1;
  SELECT id INTO drop_id FROM partners WHERE slug IS NULL AND name = 'Камчатская рыбалка' LIMIT 1;

  IF keep_id IS NOT NULL AND drop_id IS NOT NULL THEN
    UPDATE tours SET operator_id = keep_id WHERE operator_id = drop_id;
    DELETE FROM partners WHERE id = drop_id;
  END IF;
END $$;


-- ============================================================
-- 5. Add indexes for marketplace queries
-- ============================================================
CREATE INDEX IF NOT EXISTS idx_tours_route_id ON tours(route_id) WHERE route_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tours_operator_id ON tours(operator_id) WHERE operator_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tours_is_active ON tours(is_active);
CREATE INDEX IF NOT EXISTS idx_departures_tour_id ON tour_departures(tour_id);
CREATE INDEX IF NOT EXISTS idx_departures_start_date ON tour_departures(start_date);
CREATE INDEX IF NOT EXISTS idx_departures_status ON tour_departures(status);


-- ============================================================
-- 6. View: v_route_marketplace
-- Маршрут + все предложения операторов + ближайший заезд
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

  -- Туры
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

  -- Оператор
  p.id                              AS operator_id,
  p.name                            AS operator_name,
  p.slug                            AS operator_slug,
  p.rating                          AS operator_rating,
  p.review_count                    AS operator_review_count,
  p.commission_rate,
  p.is_verified                     AS operator_verified,

  -- Ближайший заезд
  next_dep.start_date               AS next_departure_date,
  next_dep.available_slots          AS next_departure_slots,
  next_dep.price_override           AS next_departure_price,
  COALESCE(next_dep.price_override, t.price) AS effective_price,

  -- Сортировочный score: рейтинг тура + комиссия
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
  'Location-first marketplace: route → operator offers → next departure. Sorted by rating+commission score.';
