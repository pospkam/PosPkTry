-- Миграция: Добавление новых ролей и исправление существующих
-- Дата: 2025-11-05
-- Описание: Добавляем роли transfer, agent, admin. Исправляем provider на соответствующие роли.

-- Шаг 1: Удаляем старый constraint
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Шаг 2: Добавляем новый constraint с полным списком ролей
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('tourist', 'operator', 'guide', 'transfer', 'agent', 'admin'));

-- Шаг 3: Обновляем существующие записи (если есть provider, меняем на operator)
UPDATE users SET role = 'operator' WHERE role = 'provider';

-- Шаг 4: Создаем индексы для производительности
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Шаг 5: Добавляем таблицу для истории изменения ролей
CREATE TABLE IF NOT EXISTS user_role_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    old_role VARCHAR(50),
    new_role VARCHAR(50) NOT NULL,
    changed_by UUID REFERENCES users(id),
    reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Шаг 6: Создаем индекс для истории
CREATE INDEX IF NOT EXISTS idx_user_role_history_user_id ON user_role_history(user_id);

-- Шаг 7: Добавляем комментарии
COMMENT ON TABLE user_role_history IS 'История изменений ролей пользователей для аудита';
COMMENT ON COLUMN users.role IS 'Роль пользователя: tourist (турист), operator (туроператор), guide (гид), transfer (трансферный оператор), agent (агент/посредник), admin (администратор)';



