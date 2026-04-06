-- Расширяем допустимые значения mode в tg_conversations
-- Добавляем 'max' для MAX бота (Кузьмич)

ALTER TABLE tg_conversations
  DROP CONSTRAINT IF EXISTS tg_conversations_mode_check;

ALTER TABLE tg_conversations
  ADD CONSTRAINT tg_conversations_mode_check
    CHECK (mode IN ('admin', 'tourist', 'max', 'telegram'));
