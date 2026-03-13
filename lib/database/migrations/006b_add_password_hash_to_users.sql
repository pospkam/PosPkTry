-- Миграция 006: Добавление password_hash в таблицу users
-- Дата: 2025-11-14
-- Описание: Добавляем поле password_hash для хранения хешированных паролей

-- Добавляем поле password_hash, если его нет
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);

-- Обновляем существующих пользователей (устанавливаем временный хеш)
-- В production нужно будет попросить пользователей сбросить пароли
UPDATE users 
SET password_hash = '$2a$10$temporary.hash.for.migration'
WHERE password_hash IS NULL;

-- Создаем индекс для быстрого поиска
CREATE INDEX IF NOT EXISTS idx_users_email_password ON users(email, password_hash);

\echo '✓ Миграция 006: password_hash добавлен в таблицу users'
