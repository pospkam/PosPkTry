-- Migration 049: add usage tracking columns to chat_sessions
-- For AI assistant 5-message limit + encrypted interest collection

ALTER TABLE chat_sessions
  ADD COLUMN IF NOT EXISTS user_message_count INT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS interests_encrypted TEXT,
  ADD COLUMN IF NOT EXISTS is_authenticated BOOLEAN NOT NULL DEFAULT FALSE;
