-- Фикс памяти: добавляем недостающие колонки в user_ai_memory
-- Без них INSERT из кода падает и долгосрочная память не работает

ALTER TABLE user_ai_memory ADD COLUMN IF NOT EXISTS group_size VARCHAR(50);
ALTER TABLE user_ai_memory ADD COLUMN IF NOT EXISTS budget_level VARCHAR(50);
ALTER TABLE user_ai_memory ADD COLUMN IF NOT EXISTS ai_notes TEXT;
ALTER TABLE user_ai_memory ADD COLUMN IF NOT EXISTS messages_count INTEGER DEFAULT 0;

-- Добавляем user_id в tg_conversations для разделения пользователей в групповых чатах
ALTER TABLE tg_conversations ADD COLUMN IF NOT EXISTS user_id BIGINT;
ALTER TABLE tg_conversations ADD COLUMN IF NOT EXISTS user_name VARCHAR(255);
ALTER TABLE tg_conversations ADD COLUMN IF NOT EXISTS platform VARCHAR(20) DEFAULT 'telegram';

-- Индекс для быстрой выборки по user_id
CREATE INDEX IF NOT EXISTS idx_tg_conv_user_id ON tg_conversations(user_id) WHERE user_id IS NOT NULL;
-- Композитный индекс: чат + платформа + время
CREATE INDEX IF NOT EXISTS idx_tg_conv_chat_platform ON tg_conversations(chat_id, platform, created_at DESC);
