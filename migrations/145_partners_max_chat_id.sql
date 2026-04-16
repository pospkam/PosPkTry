-- Migration 145: MAX chat_id для операторов
-- Операторы могут получать уведомления о бронированиях через MAX
-- (альтернатива Telegram — работает без VPN в РФ)

ALTER TABLE partners
  ADD COLUMN IF NOT EXISTS max_chat_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_partners_max_chat_id
  ON partners (max_chat_id)
  WHERE max_chat_id IS NOT NULL;

COMMENT ON COLUMN partners.max_chat_id IS
  'MAX (max.ru) chat_id оператора для уведомлений. Получить: написать боту на MAX: партнер email@example.com';
