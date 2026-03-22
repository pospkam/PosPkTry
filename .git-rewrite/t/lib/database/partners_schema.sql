-- Таблица партнеров (туроператоры, трансферные компании, размещение, аренда)
CREATE TABLE IF NOT EXISTS partners (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
  
  -- Основная информация
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(50) NOT NULL,
  
  -- Дополнительная информация
  description TEXT,
  address TEXT,
  website VARCHAR(500),
  logo_url TEXT,
  
  -- Направления деятельности (массив: operator, transfer, stay, gear)
  roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  
  -- Статус модерации
  status VARCHAR(50) NOT NULL DEFAULT 'pending', -- pending, approved, rejected
  
  -- Даты
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_at TIMESTAMP,
  
  -- Модератор
  approved_by INTEGER REFERENCES users(id)
);

-- Индексы
CREATE INDEX IF NOT EXISTS idx_partners_user_id ON partners(user_id);
CREATE INDEX IF NOT EXISTS idx_partners_email ON partners(email);
CREATE INDEX IF NOT EXISTS idx_partners_status ON partners(status);
CREATE INDEX IF NOT EXISTS idx_partners_roles ON partners USING GIN (roles);

-- Комментарии
COMMENT ON TABLE partners IS 'Партнеры платформы (туроператоры, трансферные компании, размещение, аренда снаряжения)';
COMMENT ON COLUMN partners.roles IS 'Направления деятельности партнера (operator, transfer, stay, gear)';
COMMENT ON COLUMN partners.status IS 'Статус модерации: pending - на рассмотрении, approved - одобрен, rejected - отклонен';
