-- Migration 076: Telegram Login
-- Позволяет пользователям входить через Telegram Login Widget.
-- telegram_id — уникальный идентификатор TG; email для таких аккаунтов
-- генерируется виртуальный (tg_<id>@telegram.local).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS telegram_id       BIGINT  UNIQUE,
  ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);

COMMENT ON COLUMN users.telegram_id       IS 'Telegram user ID (Login Widget). NULL для обычных аккаунтов.';
COMMENT ON COLUMN users.telegram_username IS 'Telegram username без @.';
