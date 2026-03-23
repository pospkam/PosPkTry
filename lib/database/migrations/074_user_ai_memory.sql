-- Migration 074: Персистентная память Кузьмича
-- Кузьмич помнит пользователя между сессиями: предпочтения, стиль, историю.

CREATE TABLE IF NOT EXISTS user_ai_memory (
  user_id              INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,

  -- Что любит пользователь (собирается из диалогов)
  preferred_activities TEXT[]       NOT NULL DEFAULT '{}',  -- ['fishing','trekking','thermal']
  preferred_locations  TEXT[]       NOT NULL DEFAULT '{}',  -- ['kurilskoye','mutnovsky']
  travel_style         VARCHAR(50),                         -- 'adventure'|'comfort'|'family'|'solo'
  group_size           VARCHAR(20),                         -- 'solo'|'couple'|'small_group'|'large_group'
  budget_level         VARCHAR(20),                         -- 'budget'|'mid'|'premium'

  -- Свободные заметки AI о пользователе (max 500 символов)
  ai_notes             TEXT,

  -- Метрики
  sessions_count       INTEGER      NOT NULL DEFAULT 0,
  messages_count       INTEGER      NOT NULL DEFAULT 0,
  last_updated         TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE user_ai_memory IS
  'Долгосрочная память Кузьмича: предпочтения туриста сохраняются между сессиями.';

COMMENT ON COLUMN user_ai_memory.ai_notes IS
  'Краткие заметки AI о пользователе — вводятся в system prompt новой сессии.';
