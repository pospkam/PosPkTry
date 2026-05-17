-- Migration 670: индексы на places и kamchatka_routes + очистка agent_memory
--
-- Проблема: agent_route_knowledge — VIEW (UNION ALL places + kamchatka_routes).
-- Индексы на VIEW не работают. Нужны индексы на базовых таблицах, чтобы
-- планировщик PostgreSQL применял predicate pushdown.
--
-- Все запросы /api/routes начинаются с is_visible = TRUE — это первый ключ
-- для каждого составного индекса.

-- ── places ────────────────────────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_places_visible
  ON places(is_visible);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_places_visible_category
  ON places(is_visible, category)
  WHERE is_visible = TRUE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_places_visible_location_type
  ON places(is_visible, location_type)
  WHERE is_visible = TRUE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_places_visible_activity_type
  ON places(is_visible, activity_type)
  WHERE is_visible = TRUE;

-- hasCoords=true фильтр: lat IS NOT NULL AND lng IS NOT NULL
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_places_coords
  ON places(lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

-- sort=recent
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_places_created_at
  ON places(created_at DESC)
  WHERE is_visible = TRUE;

-- ── kamchatka_routes ──────────────────────────────────────────────────────────

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kr_visible
  ON kamchatka_routes(is_visible);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kr_visible_category
  ON kamchatka_routes(is_visible, category)
  WHERE is_visible = TRUE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kr_visible_activity_type
  ON kamchatka_routes(is_visible, activity_type)
  WHERE is_visible = TRUE;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kr_coords
  ON kamchatka_routes(lat, lng)
  WHERE lat IS NOT NULL AND lng IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_kr_created_at
  ON kamchatka_routes(created_at DESC)
  WHERE is_visible = TRUE;

-- ── Очистка истёкших записей agent_memory ────────────────────────────────────
-- expires_at задаётся при создании; без очистки таблица растёт бесконечно

DELETE FROM agent_memory
  WHERE expires_at IS NOT NULL AND expires_at < NOW();

-- ── Очистка старых ai_actions_log (>60 дней) ─────────────────────────────────
-- Логи нужны для анализа Evolver за 7 дней; 60 дней — достаточный запас

DELETE FROM ai_actions_log
  WHERE created_at < NOW() - INTERVAL '60 days';
