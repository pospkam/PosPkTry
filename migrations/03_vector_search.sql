-- =============================================
-- Миграция: добавление поддержки векторного поиска
-- Требует расширения pgvector
-- =============================================

-- Расширение pgvector (если не установлено)
CREATE EXTENSION IF NOT EXISTS vector;

-- Добавить колонку эмбеддинга к турам (1536 dims — OpenAI/Groq compatible)
ALTER TABLE tours
  ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- Индекс для быстрого приближённого поиска (IVFFlat)
-- lists = 100 — хорошо для таблиц до ~100k строк
CREATE INDEX IF NOT EXISTS tours_embedding_idx
  ON tours
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

-- Сессии чата с историей сообщений
CREATE TABLE IF NOT EXISTS chat_sessions (
  id            SERIAL PRIMARY KEY,
  session_id    TEXT NOT NULL UNIQUE,
  user_id       TEXT,
  role          TEXT NOT NULL DEFAULT 'tourist',
  messages      JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS chat_sessions_user_id_idx ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS chat_sessions_updated_idx ON chat_sessions(updated_at DESC);
