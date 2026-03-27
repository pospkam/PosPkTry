-- Migration 050: Telegram conversation history
-- Stores per-chat message history for admin and tourist bots.
-- mode: 'admin' — владелец через admin-бот
--        'tourist' — турист через Kuzmich-бот

CREATE TABLE IF NOT EXISTS tg_conversations (
  id         BIGSERIAL    PRIMARY KEY,
  chat_id    BIGINT       NOT NULL,
  mode       VARCHAR(20)  NOT NULL DEFAULT 'tourist'
               CHECK (mode IN ('admin', 'tourist')),
  role       VARCHAR(10)  NOT NULL
               CHECK (role IN ('user', 'assistant')),
  content    TEXT         NOT NULL,
  created_at TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tg_conv_chat_created
  ON tg_conversations(chat_id, created_at DESC);

-- Auto-purge: удалять сообщения старше 90 дней (вызывать вручную или через cron)
-- DELETE FROM tg_conversations WHERE created_at < NOW() - INTERVAL '90 days';
