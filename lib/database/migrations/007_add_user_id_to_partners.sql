-- Миграция 007: Добавление user_id в таблицу partners для связи с users
-- Дата: 2025-11-14
-- Описание: Создаем связь между partners и users

-- Добавляем поле user_id
ALTER TABLE partners ADD COLUMN IF NOT EXISTS user_id UUID;

-- Добавляем внешний ключ
ALTER TABLE partners 
ADD CONSTRAINT fk_partners_user_id 
FOREIGN KEY (user_id) 
REFERENCES users(id) 
ON DELETE CASCADE;

-- Создаем индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_partners_user_id ON partners(user_id);

-- Добавляем уникальный индекс: один пользователь может иметь только одного партнера для каждой категории
CREATE UNIQUE INDEX IF NOT EXISTS idx_partners_user_category ON partners(user_id, category);

\echo '✓ Миграция 007: user_id добавлен в таблицу partners'
