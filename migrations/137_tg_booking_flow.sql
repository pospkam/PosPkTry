-- Migration 137: Персистентное состояние бронирования в Telegram/WhatsApp
-- Вместо in-memory Map — хранить в БД чтобы не терять при перезапуске контейнера

CREATE TABLE IF NOT EXISTS tg_booking_flow (
  chat_id    BIGINT       NOT NULL,
  mode       TEXT         NOT NULL DEFAULT 'tourist',
  state      JSONB        NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
  PRIMARY KEY (chat_id, mode)
);

-- Автоудаление устаревших flow (старше 2 часов — пользователь бросил)
CREATE INDEX IF NOT EXISTS idx_tg_booking_flow_updated
  ON tg_booking_flow (updated_at);

COMMENT ON TABLE tg_booking_flow IS 'Состояние формы бронирования в Telegram/WhatsApp — сохраняется между запросами';
