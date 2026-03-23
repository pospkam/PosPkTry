-- Migration 077: Telegram chat_id у партнёров
-- Переносим авторизацию операторов из env TELEGRAM_FISHING_CHAT_ID → БД
-- Оператор вводит свой chat_id в настройках профиля, бот проверяет по partners

ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS telegram_chat_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_partners_telegram_chat_id
  ON partners (telegram_chat_id)
  WHERE telegram_chat_id IS NOT NULL;

COMMENT ON COLUMN partners.telegram_chat_id IS
  'Telegram chat_id оператора для inline-кнопок бронирования и уведомлений. Получить: написать @userinfobot.';
