-- 122_user_ai_memory.sql
-- Таблица для хранения AI-предпочтений туристов.
-- Используется memory-bridge для синхронизации спроса в agent_memory.

CREATE TABLE IF NOT EXISTS user_ai_memory (
  id                   BIGSERIAL PRIMARY KEY,
  user_id              UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  preferred_activities TEXT[]    DEFAULT '{}',
  preferred_locations  TEXT[]    DEFAULT '{}',
  travel_style         TEXT,
  sessions_count       INT       NOT NULL DEFAULT 1,
  last_updated         TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at           TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_ai_memory_user_id       ON user_ai_memory(user_id);
CREATE INDEX IF NOT EXISTS idx_user_ai_memory_last_updated  ON user_ai_memory(last_updated);
