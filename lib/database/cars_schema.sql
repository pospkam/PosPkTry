-- ============================================
-- CAR RENTAL - СХЕМА БАЗЫ ДАННЫХ
-- ============================================

-- Таблица автомобилей
CREATE TABLE IF NOT EXISTS cars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year INTEGER NOT NULL,
  category VARCHAR(50) DEFAULT 'economy',
  transmission VARCHAR(20) DEFAULT 'manual',
  fuel_type VARCHAR(20) DEFAULT 'petrol',
  seats INTEGER DEFAULT 5,
  doors INTEGER DEFAULT 4,
  price_per_day DECIMAL(10,2) NOT NULL,
  price_per_week DECIMAL(10,2),
  price_per_month DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'RUB',
  images JSONB DEFAULT '[]',
  features JSONB DEFAULT '[]',
  mileage INTEGER DEFAULT 0,
  license_plate VARCHAR(50) UNIQUE NOT NULL,
  condition VARCHAR(20) DEFAULT 'excellent',
  deposit_amount DECIMAL(10,2) NOT NULL,
  insurance_included BOOLEAN DEFAULT TRUE,
  available_quantity INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  rating DECIMAL(3,2) DEFAULT 0.0,
  review_count INTEGER DEFAULT 0,
  rental_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_cars_category ON cars(category);
CREATE INDEX idx_cars_price ON cars(price_per_day);
CREATE INDEX idx_cars_is_active ON cars(is_active);

-- Таблица аренды автомобилей
CREATE TABLE IF NOT EXISTS car_rentals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  car_id UUID REFERENCES cars(id),
  customer_info JSONB NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL,
  pickup_location VARCHAR(255) NOT NULL,
  return_location VARCHAR(255) NOT NULL,
  rental_cost DECIMAL(10,2) NOT NULL,
  deposit_amount DECIMAL(10,2) NOT NULL,
  insurance_cost DECIMAL(10,2) DEFAULT 0,
  total DECIMAL(10,2) NOT NULL,
  deposit_paid BOOLEAN DEFAULT FALSE,
  deposit_refunded BOOLEAN DEFAULT FALSE,
  status VARCHAR(50) DEFAULT 'pending',
  payment_status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_car_rentals_user_id ON car_rentals(user_id);
CREATE INDEX idx_car_rentals_car_id ON car_rentals(car_id);
CREATE INDEX idx_car_rentals_status ON car_rentals(status);
CREATE INDEX idx_car_rentals_dates ON car_rentals(start_date, end_date);

-- Таблица доступности автомобилей
CREATE TABLE IF NOT EXISTS car_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  car_id UUID REFERENCES cars(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  rental_id UUID REFERENCES car_rentals(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(car_id, date)
);

CREATE INDEX idx_car_availability_car_date ON car_availability(car_id, date);

\echo '✓ Car Rental таблицы созданы'

