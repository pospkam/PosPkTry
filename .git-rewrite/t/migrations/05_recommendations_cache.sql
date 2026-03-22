-- =============================================
-- Миграция: кэш рекомендаций для пользователей
-- =============================================

-- Добавить колонки кэша рекомендаций в таблицу users
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS recommendations JSONB DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS recommended_at TIMESTAMPTZ DEFAULT NULL;

-- Индекс для быстрой проверки свежести кэша
CREATE INDEX IF NOT EXISTS users_recommended_at_idx
  ON users(recommended_at)
  WHERE recommended_at IS NOT NULL;
