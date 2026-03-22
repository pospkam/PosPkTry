-- 022_alter_chat_sessions_add_columns.sql
-- Добавляет колонки session_id, role, messages к существующей таблице chat_sessions.
-- Безопасно: использует IF NOT EXISTS, идемпотентно.

ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS session_id TEXT;
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'tourist';
ALTER TABLE chat_sessions ADD COLUMN IF NOT EXISTS messages JSONB NOT NULL DEFAULT '[]'::jsonb;

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_sessions_session_id
  ON chat_sessions(session_id) WHERE session_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user_id
  ON chat_sessions(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_updated_at
  ON chat_sessions(updated_at DESC);
