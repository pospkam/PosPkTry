-- ============================================
-- GEAR RENTAL - СХЕМА БАЗЫ ДАННЫХ
-- ============================================

-- Таблица снаряжения
CREATE TABLE IF NOT EXISTS gear_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL,
  subcategory VARCHAR(100),
  brand VARCHAR(100),
  model VARCHAR(100),
  price_per_day DECIMAL(10,2) NOT NULL,
  price_per_week DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'RUB',
  images JSONB DEFAULT '[]',
  specifications JSONB DEFAULT '{}',
  condition VARCHAR(20) DEFAULT 'good',
  quantity INTEGER DEFAULT 1,
  available_quantity INTEGER DEFAULT 1,
  requires_deposit BOOLEAN DEFAULT TRUE,
  deposit_amount DECIMAL(10,2),
  requires_insurance BOOLEAN DEFAULT FALSE,
  insurance_cost DECIMAL(10,2),
  tags JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  rating DECIMAL(3,2) DEFAULT 0.0,
  review_count INTEGER DEFAULT 0,
  rental_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gear_category ON gear_items(category);
CREATE INDEX idx_gear_price ON gear_items(price_per_day);
CREATE INDEX idx_gear_is_active ON gear_items(is_active);

-- Таблица аренды снаряжения
CREATE TABLE IF NOT EXISTS gear_rentals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  customer_info JSONB NOT NULL,
  items JSONB NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL,
  rental_cost DECIMAL(10,2) NOT NULL,
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  insurance_cost DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  deposit_paid BOOLEAN DEFAULT FALSE,
  deposit_refunded BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'pending',
  payment_status VARCHAR(50) DEFAULT 'pending',
  pickup_location VARCHAR(255),
  return_location VARCHAR(255),
  pickup_date_time TIMESTAMPTZ,
  return_date_time TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_gear_rentals_user_id ON gear_rentals(user_id);
CREATE INDEX idx_gear_rentals_status ON gear_rentals(status);
CREATE INDEX idx_gear_rentals_dates ON gear_rentals(start_date, end_date);

-- Таблица элементов аренды
CREATE TABLE IF NOT EXISTS gear_rental_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id UUID REFERENCES gear_rentals(id) ON DELETE CASCADE,
  gear_id UUID REFERENCES gear_items(id),
  quantity INTEGER NOT NULL,
  price_per_day DECIMAL(10,2) NOT NULL,
  total_days INTEGER NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  insurance_cost DECIMAL(10,2) DEFAULT 0,
  condition VARCHAR(20)
);

CREATE INDEX idx_gear_rental_items_rental_id ON gear_rental_items(rental_id);

-- Таблица доступности снаряжения
CREATE TABLE IF NOT EXISTS gear_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gear_id UUID REFERENCES gear_items(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_quantity INTEGER NOT NULL,
  rented_quantity INTEGER DEFAULT 0,
  available_quantity INTEGER NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gear_id, date)
);

CREATE INDEX idx_gear_availability_gear_date ON gear_availability(gear_id, date);

\echo '✓ Gear Rental таблицы созданы'

