-- Фикс памяти AI чата на сайте
-- Проблема: ON CONFLICT (session_id) требует полный UNIQUE индекс,
-- но существующий idx_chat_sessions_session_id был частичным (WHERE session_id IS NOT NULL)
-- PostgreSQL не мог сопоставить ON CONFLICT с partial index → INSERT падал молча → памяти не было

CREATE UNIQUE INDEX IF NOT EXISTS idx_chat_sessions_session_id_full
  ON chat_sessions(session_id);
