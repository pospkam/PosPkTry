-- Migration 045: Migrate tours to operator_tours system
-- Date: 2026-03-19
-- Purpose: Add missing fields to operator_tours, seed 11 fishingkam tours,
--          re-create v_route_marketplace pointing to new system

BEGIN;

-- ============================================================
-- 1. ALTER TABLE operator_tours — add missing fields
-- ============================================================

ALTER TABLE operator_tours
  ADD COLUMN IF NOT EXISTS price_old DECIMAL(10,2),
  ADD COLUMN IF NOT EXISTS price_unit VARCHAR(30) DEFAULT 'per_tour',
  ADD COLUMN IF NOT EXISTS short_description TEXT,
  ADD COLUMN IF NOT EXISTS difficulty VARCHAR(20),
  ADD COLUMN IF NOT EXISTS included JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS not_included JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS what_to_bring JSONB DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS photos TEXT[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS tour_image TEXT,
  ADD COLUMN IF NOT EXISTS agent_route_id UUID,
  ADD COLUMN IF NOT EXISTS rating DECIMAL(3,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS review_count INT DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_operator_tours_agent_route ON operator_tours(agent_route_id) WHERE agent_route_id IS NOT NULL;

-- ============================================================
-- 2. INSERT 11 tours from fishingkam operator
-- ============================================================

DO $$
DECLARE
  op_id UUID;
  route_id UUID := '92c9ded2-09db-473c-9e2d-7e963dd16bed';
BEGIN
  SELECT id INTO op_id FROM partners WHERE slug = 'kamchatskaya-rybalka' LIMIT 1;
  IF op_id IS NULL THEN
    RAISE EXCEPTION 'Operator kamchatskaya-rybalka not found';
  END IF;

  -- 1. Зимняя рыбалка (январь-март)
  INSERT INTO operator_tours (
    operator_id, title, short_description, description, location_type, activity_type,
    location_name, latitude, longitude, base_price, price_old, price_unit, currency,
    max_participants, min_participants, duration_hours, duration_type, multi_day_count,
    season_start, season_end, difficulty, weather_dependent, included, tour_image,
    agent_route_id, is_active, is_published
  ) VALUES (
    op_id, 'Зимняя рыбалка (январь-март)',
    'Царство льда и серебристых трофеев. Микижа, хариус, кунжа и голец на весь год.',
    'Легендарный зимний сезон на реках Камчатки: время, когда вода превращается в зеркало, а рыба готова к боевому контакту. Микижа и хариус достигают максимального веса, кунжа проявляет агрессию, голец окончательно вселяет рыболовный экстаз. На базе «Камчатская Рыбалка» вас ждёт премиальный комфорт на льду: палатка HIGASHI с печкой, горячие напитки, опытные гиды, палаточное кемпинговое сообщество охотников. Впечатления на всю жизнь и холодильник, полный трофеев.',
    'river', 'fishing', 'Рыболовная база «Камчатская Рыбалка»',
    55.4441, 159.5874, 18000, 20000, 'per_day_per_person', 'RUB',
    10, 5, 24, 'day', NULL,
    '2026-01-15', '2026-03-20', 'medium', true,
    '["Размещение на базе","Зимний комплект снаряжения","Снегоход и нарта","Палатка HIGASHI с печкой","Ледобур","Сопровождение гида"]',
    '/images/fishingkam/2025-01-09_113928_1_.jpg',
    route_id, true, true
  );

  -- 2. Зимняя рыбалка (февраль-апрель)
  INSERT INTO operator_tours (
    operator_id, title, short_description, description, location_type, activity_type,
    location_name, latitude, longitude, base_price, price_old, price_unit,
    max_participants, min_participants, duration_hours, duration_type,
    season_start, season_end, difficulty, weather_dependent, included, tour_image,
    agent_route_id, is_active, is_published
  ) VALUES (
    op_id, 'Зимняя рыбалка (февраль-апрель)',
    'Пик зимнего сезона: максимальный клёв, премиальные трофеи, боевая хариус.',
    'Февраль-апрель на Камчатке — это GUERRE. Вода кипит активностью. Микижа агрессивна, хариус кусает почти каждый заброс, кунжа учиняет настоящий карнавал. Голец ловится так часто, что гид скажет: «На, вот и завтрак». На рыболовной базе вас ждёт полный контроль над ситуацией: тепло палаток HIGASHI, стратегические места лова, гиды с 20-летним опытом, горячая еда и неограниченный адреналин. Это не туризм — это охота за легендарными трофеями Камчатки. Гарантия: вы вернётесь с рыбой или ваши деньги возвращаются на счёт.',
    'river', 'fishing', 'Рыболовная база «Камчатская Рыбалка»',
    55.4441, 159.5874, 22000, NULL, 'per_day_per_person',
    10, 5, 24, 'day',
    '2026-02-01', '2026-04-15', 'medium', true,
    '["Размещение на базе","Зимний комплект снаряжения","Снегоход и нарта","Палатка HIGASHI с печкой","Ледобур","Сопровождение гида"]',
    '/images/fishingkam/2025-01-09_114821_1.jpg',
    route_id, true, true
  );

  -- 3. Зимняя рыбалка (ноябрь-январь)
  INSERT INTO operator_tours (
    operator_id, title, short_description, location_type, activity_type,
    location_name, latitude, longitude, base_price, price_old, price_unit,
    max_participants, min_participants, duration_hours, duration_type,
    season_start, season_end, difficulty, weather_dependent, included, tour_image,
    agent_route_id, is_active, is_published
  ) VALUES (
    op_id, 'Зимняя рыбалка (ноябрь-январь)',
    'Начало зимы: кижуч + микижа, хариус, кунжа, голец.',
    'river', 'fishing', 'Рыболовная база «Камчатская Рыбалка»',
    55.4441, 159.5874, 22000, NULL, 'per_day_per_person',
    10, 5, 24, 'day',
    '2025-11-01', '2026-01-15', 'medium', true,
    '["Размещение на базе","Зимний комплект снаряжения","Снегоход и нарта","Палатка HIGASHI с печкой","Ледобур","Сопровождение гида"]',
    '/images/fishingkam/2025-01-09_114531_1.jpg',
    route_id, true, true
  );

  -- 4. Осенняя рыбалка (октябрь-ноябрь)
  INSERT INTO operator_tours (
    operator_id, title, short_description, location_type, activity_type,
    location_name, latitude, longitude, base_price, price_unit,
    max_participants, min_participants, duration_hours, duration_type,
    season_start, season_end, difficulty, weather_dependent, included, tour_image,
    agent_route_id, is_active, is_published
  ) VALUES (
    op_id, 'Осенняя рыбалка (октябрь-ноябрь)',
    'Поздний кижуч + микижа, хариус, кунжа, голец. Золотая осень.',
    'river', 'fishing', 'Рыболовная база «Камчатская Рыбалка»',
    55.4441, 159.5874, 25000, 'per_day_per_person',
    10, 5, 24, 'day',
    '2025-10-01', '2025-11-15', 'easy', true,
    '["Размещение на базе","Летний комплект снаряжения","Сопровождение гида"]',
    '/images/fishingkam/2025-02-10_151421.jpg',
    route_id, true, true
  );

  -- 5. Летняя рыбалка на чавычу и нерку
  INSERT INTO operator_tours (
    operator_id, title, short_description, location_type, activity_type,
    location_name, latitude, longitude, base_price, price_unit,
    max_participants, min_participants, duration_hours, duration_type,
    season_start, season_end, difficulty, weather_dependent, included, tour_image,
    agent_route_id, is_active, is_published
  ) VALUES (
    op_id, 'Летняя рыбалка на чавычу и нерку',
    'Ход чавычи и нерки. Шанс поймать королевского лосося!',
    'river', 'fishing', 'Рыболовная база «Камчатская Рыбалка»',
    55.4441, 159.5874, 28000, 'per_day_per_person',
    10, 5, 24, 'day',
    '2026-06-01', '2026-08-15', 'easy', true,
    '["Размещение на базе","Летний комплект снаряжения","Лодка с мотором","Сопровождение гида"]',
    '/images/fishingkam/2025-02-10_151433.jpg',
    route_id, true, true
  );

  -- 6. Летняя рыбалка на кижуча
  INSERT INTO operator_tours (
    operator_id, title, short_description, location_type, activity_type,
    location_name, latitude, longitude, base_price, price_unit,
    max_participants, min_participants, duration_hours, duration_type,
    season_start, season_end, difficulty, weather_dependent, included, tour_image,
    agent_route_id, is_active, is_published
  ) VALUES (
    op_id, 'Летняя рыбалка на кижуча',
    'Серебряный лосось кижуч + микижа, хариус, кунжа, голец.',
    'river', 'fishing', 'Рыболовная база «Камчатская Рыбалка»',
    55.4441, 159.5874, 28000, 'per_day_per_person',
    10, 5, 24, 'day',
    '2026-08-01', '2026-10-15', 'easy', true,
    '["Размещение на базе","Летний комплект снаряжения","Лодка с мотором","Сопровождение гида"]',
    '/images/fishingkam/2025-02-10_151416.jpg',
    route_id, true, true
  );

  -- 7. Семейный тур выходного дня
  INSERT INTO operator_tours (
    operator_id, title, short_description, location_type, activity_type,
    location_name, latitude, longitude, base_price, price_unit,
    max_participants, min_participants, duration_hours, duration_type, multi_day_count,
    season_start, season_end, difficulty, weather_dependent, included, tour_image,
    agent_route_id, is_active, is_published
  ) VALUES (
    op_id, 'Семейный тур выходного дня',
    'Семейная рыбалка на 2 дня. Дети от 10 лет.',
    'river', 'fishing', 'Рыболовная база «Камчатская Рыбалка»',
    55.4441, 159.5874, 45000, 'per_tour',
    6, 3, 48, 'multi_day', 2,
    '2026-06-01', '2026-09-15', 'easy', true,
    '["Проживание на базе 2 ночи","Снаряжение для всей семьи","Инструктаж для начинающих","Сопровождение гида","Детская программа"]',
    '/images/fishingkam/2025-02-10_151450.jpg',
    route_id, true, true
  );

  -- 8. Многодневный зимний тур (3 дня)
  INSERT INTO operator_tours (
    operator_id, title, short_description, location_type, activity_type,
    location_name, latitude, longitude, base_price, price_unit,
    max_participants, min_participants, duration_hours, duration_type, multi_day_count,
    season_start, season_end, difficulty, weather_dependent, included, tour_image,
    agent_route_id, is_active, is_published
  ) VALUES (
    op_id, 'Многодневный зимний тур (3 дня)',
    '3 дня зимней рыбалки с проживанием на базе.',
    'river', 'fishing', 'Рыболовная база «Камчатская Рыбалка»',
    55.4441, 159.5874, 54000, 'per_tour',
    10, 5, 72, 'multi_day', 3,
    '2026-01-15', '2026-04-15', 'medium', true,
    '["Проживание на базе 3 ночи","Зимний комплект снаряжения","Снегоход и нарта","Палатка HIGASHI с печкой","Ледобур","Сопровождение гида"]',
    '/images/fishingkam/2025-01-27_142818_1.jpg',
    route_id, true, true
  );

  -- 9. Многодневный летний тур (5 дней)
  INSERT INTO operator_tours (
    operator_id, title, short_description, location_type, activity_type,
    location_name, latitude, longitude, base_price, price_unit,
    max_participants, min_participants, duration_hours, duration_type, multi_day_count,
    season_start, season_end, difficulty, weather_dependent, included, tour_image,
    agent_route_id, is_active, is_published
  ) VALUES (
    op_id, 'Многодневный летний тур (5 дней)',
    '5 дней летней рыбалки на лосося с проживанием.',
    'river', 'fishing', 'Рыболовная база «Камчатская Рыбалка»',
    55.4441, 159.5874, 140000, 'per_tour',
    10, 5, 120, 'multi_day', 5,
    '2026-06-01', '2026-10-15', 'easy', true,
    '["Проживание на базе 5 ночей","Летний комплект снаряжения","Лодка с мотором","Сопровождение гида"]',
    '/images/fishingkam/2025-01-27_142653.jpg',
    route_id, true, true
  );

  -- 10. Семейный недельный тур
  INSERT INTO operator_tours (
    operator_id, title, short_description, location_type, activity_type,
    location_name, latitude, longitude, base_price, price_unit,
    max_participants, min_participants, duration_hours, duration_type, multi_day_count,
    season_start, season_end, difficulty, weather_dependent, included, tour_image,
    agent_route_id, is_active, is_published
  ) VALUES (
    op_id, 'Семейный недельный тур',
    '7 дней семейного отдыха: рыбалка + экскурсии. Дети от 7 лет.',
    'river', 'fishing', 'Рыболовная база «Камчатская Рыбалка»',
    55.4441, 159.5874, 150000, 'per_tour',
    8, 4, 168, 'multi_day', 7,
    '2026-06-01', '2026-09-15', 'easy', true,
    '["Проживание на базе 7 ночей","Снаряжение для всей семьи","Инструктаж для начинающих","Сопровождение гида","Экскурсионная программа","Детские развлечения"]',
    '/images/fishingkam/2025-01-27_142814.jpg',
    route_id, true, true
  );

  -- 11. Недельный рыболовный тур (7 дней)
  INSERT INTO operator_tours (
    operator_id, title, short_description, location_type, activity_type,
    location_name, latitude, longitude, base_price, price_unit,
    max_participants, min_participants, duration_hours, duration_type, multi_day_count,
    season_start, season_end, difficulty, weather_dependent, included, tour_image,
    agent_route_id, is_active, is_published
  ) VALUES (
    op_id, 'Недельный рыболовный тур (7 дней)',
    '7 дней рыбалки: все виды рыб, разные локации.',
    'river', 'fishing', 'Рыболовная база «Камчатская Рыбалка»',
    55.4441, 159.5874, 196000, 'per_tour',
    8, 4, 168, 'multi_day', 7,
    '2026-06-01', '2026-10-15', 'easy', true,
    '["Проживание на базе 7 ночей","Полный комплект снаряжения","Лодка с мотором","Сопровождение опытного гида","Первичная обработка улова"]',
    '/images/fishingkam/2025-01-27_142551.jpg',
    route_id, true, true
  );

  RAISE NOTICE 'Inserted 11 tours for operator %', op_id;
END $$;

-- ============================================================
-- 3. Re-create v_route_marketplace from operator_tours
-- ============================================================

DROP VIEW IF EXISTS v_route_marketplace;

CREATE VIEW v_route_marketplace AS
SELECT
  ot.agent_route_id            AS route_id,
  ot.id                        AS tour_id,
  ot.title                     AS tour_name,
  ot.short_description         AS tour_short_desc,
  ot.tour_image,
  ot.base_price                AS tour_price_base,
  ot.price_old,
  ot.price_unit,
  ot.duration_hours            AS tour_duration_hours,
  ot.duration_type,
  ot.multi_day_count,
  ot.difficulty                AS tour_difficulty,
  ot.max_participants          AS max_group_size,
  ot.min_participants          AS min_group_size,
  ot.rating                    AS tour_rating,
  ot.review_count              AS tour_review_count,
  ot.included,
  ot.season_start,
  ot.season_end,
  p.id                         AS operator_id,
  p.name                       AS operator_name,
  p.slug                       AS operator_slug,
  p.hero_image                 AS operator_hero_image,
  p.rating                     AS operator_rating,
  p.review_count               AS operator_review_count,
  p.commission_rate,
  p.is_verified                AS operator_verified,
  next_slot.date               AS next_departure_date,
  next_slot.available_slots    AS next_departure_slots,
  next_slot.base_price_override AS next_departure_price,
  COALESCE(next_slot.base_price_override, ot.base_price) AS effective_price,
  (COALESCE(ot.rating, 0) * 0.7 + COALESCE(p.commission_rate, 0) * 30 * 0.3) AS marketplace_score
FROM operator_tours ot
JOIN partners p ON p.id = ot.operator_id
LEFT JOIN LATERAL (
  SELECT a.date, a.available_slots, a.base_price_override
  FROM tour_availability a
  WHERE a.operator_tour_id = ot.id
    AND a.date >= CURRENT_DATE
    AND a.is_cancelled = false
    AND a.available_slots > a.booked_slots
  ORDER BY a.date ASC
  LIMIT 1
) next_slot ON true
WHERE ot.is_active = true
  AND ot.is_published = true
  AND ot.deleted_at IS NULL;

COMMENT ON VIEW v_route_marketplace IS
  'Migration 045: now sources from operator_tours (not legacy tours table). Links to agent_route_knowledge via agent_route_id.';

-- ============================================================
-- 4. Verify
-- ============================================================

DO $$
DECLARE
  cnt INT;
BEGIN
  SELECT COUNT(*) INTO cnt FROM operator_tours WHERE agent_route_id IS NOT NULL;
  IF cnt < 11 THEN
    RAISE EXCEPTION 'Expected 11 tours, got %', cnt;
  END IF;
  SELECT COUNT(*) INTO cnt FROM v_route_marketplace;
  IF cnt < 11 THEN
    RAISE EXCEPTION 'v_route_marketplace has % rows, expected 11+', cnt;
  END IF;
  RAISE NOTICE 'Migration 045 OK: % operator_tours, % marketplace rows', cnt, cnt;
END $$;

COMMIT;
