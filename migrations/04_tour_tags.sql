-- =============================================
-- Миграция: AI теги для туров
-- =============================================

-- Добавить колонку ai_tags (JSONB) к таблице туров
ALTER TABLE tours
  ADD COLUMN IF NOT EXISTS ai_tags JSONB DEFAULT '{}'::jsonb;

-- GIN индекс для быстрого поиска по тегам
CREATE INDEX IF NOT EXISTS tours_ai_tags_idx
  ON tours
  USING gin(ai_tags);

-- Пример структуры ai_tags:
-- {
--   "landscape": ["volcano", "snow", "mountain"],
--   "activity": ["hiking", "helicopter"],
--   "difficulty": "moderate",
--   "season": ["summer", "autumn"],
--   "features": ["bears", "wildlife"]
-- }
