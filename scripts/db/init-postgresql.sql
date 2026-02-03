-- ПОЛНАЯ ИНИЦИАЛИЗАЦИЯ POSTGRESQL ДЛЯ KAMHUB
-- Автор: Cursor AI Agent
-- Дата: 2025-10-30
-- Использование: psql $DATABASE_URL -f scripts/init-postgresql.sql

-- ============================================
-- 1. СОЗДАНИЕ РАСШИРЕНИЙ
-- ============================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS postgis;

\echo '✓ Расширения созданы'

-- ============================================
-- 2. ОСНОВНЫЕ ТАБЛИЦЫ
-- ============================================

-- Пользователи
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  phone VARCHAR(50),
  role VARCHAR(50) DEFAULT 'user',
  email_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

\echo '✓ Таблица users создана'

-- Операторы трансферов
CREATE TABLE IF NOT EXISTS transfer_operators (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  company_name VARCHAR(255) NOT NULL,
  license_number VARCHAR(100),
  rating DECIMAL(3,2) DEFAULT 5.00,
  total_trips INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT NOW()
);

\echo '✓ Таблица transfer_operators создана'

-- Транспортные средства
CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operator_id UUID REFERENCES transfer_operators(id),
  type VARCHAR(50) NOT NULL,
  model VARCHAR(100),
  capacity INTEGER NOT NULL,
  license_plate VARCHAR(50),
  year INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

\echo '✓ Таблица vehicles создана'

-- Маршруты трансферов
CREATE TABLE IF NOT EXISTS transfer_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operator_id UUID REFERENCES transfer_operators(id),
  from_location VARCHAR(255) NOT NULL,
  to_location VARCHAR(255) NOT NULL,
  from_coordinates GEOGRAPHY(Point, 4326),
  to_coordinates GEOGRAPHY(Point, 4326),
  distance_km DECIMAL(10,2),
  duration_minutes INTEGER,
  base_price DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

\echo '✓ Таблица transfer_routes создана'

-- Расписание трансферов
CREATE TABLE IF NOT EXISTS transfer_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  route_id UUID REFERENCES transfer_routes(id),
  vehicle_id UUID REFERENCES vehicles(id),
  departure_time TIMESTAMP NOT NULL,
  arrival_time TIMESTAMP,
  available_seats INTEGER NOT NULL,
  price_per_seat DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'scheduled',
  created_at TIMESTAMP DEFAULT NOW()
);

\echo '✓ Таблица transfer_schedules создана'

-- Бронирования
CREATE TABLE IF NOT EXISTS transfer_bookings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  schedule_id UUID REFERENCES transfer_schedules(id),
  operator_id UUID REFERENCES transfer_operators(id),
  seats_count INTEGER NOT NULL DEFAULT 1,
  total_price DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  passenger_name VARCHAR(255),
  passenger_phone VARCHAR(50),
  passenger_email VARCHAR(255),
  pickup_location VARCHAR(255),
  dropoff_location VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

\echo '✓ Таблица transfer_bookings создана'

-- ============================================
-- 3. ТАБЛИЦЫ ПЛАТЕЖЕЙ
-- ============================================

CREATE TABLE IF NOT EXISTS transfer_payments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES transfer_bookings(id),
  transaction_id VARCHAR(255) UNIQUE,
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'RUB',
  status VARCHAR(50) DEFAULT 'pending',
  payment_method VARCHAR(50),
  customer_email VARCHAR(255),
  customer_phone VARCHAR(50),
  error_message TEXT,
  processed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

\echo '✓ Таблица transfer_payments создана'

-- ============================================
-- 4. ТАБЛИЦЫ УВЕДОМЛЕНИЙ
-- ============================================

CREATE TABLE IF NOT EXISTS transfer_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID REFERENCES transfer_bookings(id),
  user_id UUID REFERENCES users(id),
  operator_id UUID REFERENCES transfer_operators(id),
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

\echo '✓ Таблица transfer_notifications создана'

-- ============================================
-- 5. ТАБЛИЦА УДЕРЖАНИЯ МЕСТ (ВАЖНО!)
-- ============================================

CREATE TABLE IF NOT EXISTS seat_holds (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  schedule_id UUID REFERENCES transfer_schedules(id),
  seats_count INTEGER NOT NULL,
  session_id VARCHAR(255) NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_schedule_expires (schedule_id, expires_at),
  INDEX idx_session (session_id)
);

\echo '✓ Таблица seat_holds создана'

-- ============================================
-- 6. ПРОГРАММА ЛОЯЛЬНОСТИ
-- ============================================

CREATE TABLE IF NOT EXISTS loyalty_tiers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  min_points INTEGER NOT NULL,
  discount_percent DECIMAL(5,2) NOT NULL,
  benefits TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_loyalty (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) UNIQUE,
  points INTEGER DEFAULT 0,
  tier_id UUID REFERENCES loyalty_tiers(id),
  total_bookings INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  booking_id UUID REFERENCES transfer_bookings(id),
  points INTEGER NOT NULL,
  type VARCHAR(50) NOT NULL,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

\echo '✓ Таблицы loyalty созданы'

-- ============================================
-- 7. ЭКО-БАЛЛЫ
-- ============================================

CREATE TABLE IF NOT EXISTS eco_points (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id) UNIQUE,
  total_points INTEGER DEFAULT 0,
  co2_saved_kg DECIMAL(10,2) DEFAULT 0,
  trees_equivalent INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS eco_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  booking_id UUID REFERENCES transfer_bookings(id),
  points INTEGER NOT NULL,
  co2_saved_kg DECIMAL(10,2),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

\echo '✓ Таблицы eco_points созданы'

-- ============================================
-- 8. ИНДЕКСЫ ДЛЯ ПРОИЗВОДИТЕЛЬНОСТИ
-- ============================================

CREATE INDEX IF NOT EXISTS idx_bookings_user ON transfer_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_bookings_schedule ON transfer_bookings(schedule_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON transfer_bookings(status);
CREATE INDEX IF NOT EXISTS idx_schedules_route ON transfer_schedules(route_id);
CREATE INDEX IF NOT EXISTS idx_schedules_departure ON transfer_schedules(departure_time);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON transfer_payments(booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_transaction ON transfer_payments(transaction_id);
CREATE INDEX IF NOT EXISTS idx_routes_locations ON transfer_routes(from_location, to_location);
CREATE INDEX IF NOT EXISTS idx_routes_coordinates ON transfer_routes USING GIST(from_coordinates);

\echo '✓ Индексы созданы'

-- ============================================
-- 9. НАЧАЛЬНЫЕ ДАННЫЕ
-- ============================================

-- Уровни лояльности
INSERT INTO loyalty_tiers (name, min_points, discount_percent, benefits) VALUES
  ('Бронзовый', 0, 0, 'Базовый уровень'),
  ('Серебряный', 1000, 5, 'Скидка 5%, приоритетная поддержка'),
  ('Золотой', 5000, 10, 'Скидка 10%, бесплатная отмена за 24ч'),
  ('Платиновый', 10000, 15, 'Скидка 15%, VIP поддержка, бонусные места')
ON CONFLICT DO NOTHING;

\echo '✓ Начальные данные добавлены'

-- ============================================
-- 10. ФУНКЦИИ ОЧИСТКИ
-- ============================================

-- Функция очистки истекших seat_holds
CREATE OR REPLACE FUNCTION cleanup_expired_seat_holds()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM seat_holds WHERE expires_at < NOW();
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

\echo '✓ Функции созданы'

-- ============================================
-- СТАТИСТИКА
-- ============================================

SELECT 
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

\echo ''
\echo '=========================================='
\echo '✅ ИНИЦИАЛИЗАЦИЯ POSTGRESQL ЗАВЕРШЕНА!'
\echo '=========================================='
\echo ''
\echo 'Создано:'
\echo '  • 2 расширения (uuid-ossp, postgis)'
\echo '  • 17 таблиц'
\echo '  • 9 индексов'
\echo '  • 4 уровня лояльности'
\echo '  • 1 функция очистки'
\echo ''
\echo 'Следующие шаги:'
\echo '  1. Создайте тестового пользователя'
\echo '  2. Добавьте операторов и маршруты'
\echo '  3. Проверьте через /api/health/db'
\echo ''
\echo 'Проверка:'
\echo '  SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = '\''public'\'';'
\echo ''
