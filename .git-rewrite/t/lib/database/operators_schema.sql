-- =============================================
-- СХЕМА ТАБЛИЦЫ ОПЕРАТОРОВ (КРИТИЧЕСКОЕ ИСПРАВЛЕНИЕ)
-- Kamchatour Hub - Operators Schema
-- =============================================

-- ВАЖНО: Эта таблица необходима для работы модуля трансферов!
-- В transfer_schema.sql используются ссылки на operators(id), но таблица не была создана.

-- Создаём таблицу операторов
CREATE TABLE IF NOT EXISTS operators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('tour', 'transfer', 'both')),
  description TEXT,
  address TEXT,
  rating DECIMAL(3,2) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
  review_count INTEGER DEFAULT 0,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  license_number VARCHAR(100),
  tax_id VARCHAR(50),
  bank_details JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Индексы для operators
CREATE INDEX IF NOT EXISTS idx_operators_category ON operators(category);
CREATE INDEX IF NOT EXISTS idx_operators_is_active ON operators(is_active);
CREATE INDEX IF NOT EXISTS idx_operators_is_verified ON operators(is_verified);
CREATE INDEX IF NOT EXISTS idx_operators_rating ON operators(rating);
CREATE INDEX IF NOT EXISTS idx_operators_email ON operators(email);

-- Триггер для автоматического обновления updated_at
CREATE TRIGGER update_operators_updated_at 
  BEFORE UPDATE ON operators
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

-- Вставляем тестовых операторов
INSERT INTO operators (id, name, phone, email, category, description, is_verified, is_active) VALUES
(
  '550e8400-e29b-41d4-a716-446655440000',
  'Камчатка Трансфер',
  '+7-914-000-00-00',
  'info@kamchatka-transfer.ru',
  'transfer',
  'Надёжные трансферы по Камчатке с 2015 года',
  true,
  true
),
(
  '550e8400-e29b-41d4-a716-446655440001',
  'Вулканы Камчатки Тур',
  '+7-914-111-11-11',
  'info@volcano-tour.ru',
  'tour',
  'Экскурсии к вулканам и горячим источникам',
  true,
  true
),
(
  '550e8400-e29b-41d4-a716-446655440002',
  'Камчатка Приключения',
  '+7-914-222-22-22',
  'hello@kamadventure.ru',
  'both',
  'Полный спектр туристических услуг: туры + трансферы',
  true,
  true
),
(
  '550e8400-e29b-41d4-a716-446655440003',
  'Восточный экспресс',
  '+7-914-333-33-33',
  'support@east-express.ru',
  'transfer',
  'Трансферы из аэропорта Елизово в город и обратно',
  false,
  true
),
(
  '550e8400-e29b-41d4-a716-446655440004',
  'Легенды Камчатки',
  '+7-914-444-44-44',
  'booking@legends-kamchatka.ru',
  'tour',
  'Этнографические туры и знакомство с культурой коренных народов',
  true,
  true
)
ON CONFLICT (id) DO NOTHING;

-- Обновляем существующие записи в transfer_vehicles и transfer_drivers
-- (если они уже созданы с некорректными operator_id)
UPDATE transfer_vehicles 
SET operator_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE operator_id IS NOT NULL 
  AND operator_id NOT IN (SELECT id FROM operators);

UPDATE transfer_drivers 
SET operator_id = '550e8400-e29b-41d4-a716-446655440000'
WHERE operator_id IS NOT NULL 
  AND operator_id NOT IN (SELECT id FROM operators);

-- Представление для полной информации об операторах
CREATE OR REPLACE VIEW operator_full_info AS
SELECT 
  o.*,
  COUNT(DISTINCT v.id) as total_vehicles,
  COUNT(DISTINCT d.id) as total_drivers,
  COUNT(DISTINCT b.id) as total_bookings,
  COALESCE(SUM(b.total_price), 0) as total_revenue
FROM operators o
LEFT JOIN transfer_vehicles v ON o.id = v.operator_id AND v.is_active = true
LEFT JOIN transfer_drivers d ON o.id = d.operator_id AND d.is_active = true
LEFT JOIN transfer_bookings b ON o.id = b.operator_id
GROUP BY o.id;

-- Комментарии
COMMENT ON TABLE operators IS 'Операторы (туроператоры и владельцы трансферов)';
COMMENT ON COLUMN operators.category IS 'Категория: tour (только туры), transfer (только трансферы), both (туры + трансферы)';
COMMENT ON COLUMN operators.rating IS 'Общий рейтинг оператора (0-5)';
COMMENT ON COLUMN operators.is_verified IS 'Верифицирован ли оператор администрацией';
COMMENT ON COLUMN operators.is_active IS 'Активен ли оператор на платформе';

-- Вывод информации
SELECT 
  'Таблица operators создана успешно!' as status,
  COUNT(*) as total_operators
FROM operators;
