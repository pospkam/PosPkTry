-- ============================================
-- TRANSFER OPERATOR - СХЕМА БАЗЫ ДАННЫХ
-- ============================================

-- Таблица водителей
CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operator_id UUID REFERENCES transfer_operators(id),
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  license_number VARCHAR(100) NOT NULL,
  license_expiry DATE NOT NULL,
  experience INTEGER DEFAULT 0,
  languages JSONB DEFAULT '[]',
  rating DECIMAL(3,2) DEFAULT 5.0,
  total_trips INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  vehicle_id UUID,
  emergency_contact JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_drivers_operator_id ON drivers(operator_id);
CREATE INDEX idx_drivers_status ON drivers(status);

-- Обновляем таблицу vehicles (добавляем недостающие поля)
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS name VARCHAR(255);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'economy';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS location VARCHAR(255);
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS features JSONB DEFAULT '[]';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS images JSONB DEFAULT '[]';
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Таблица трансферов
CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operator_id UUID REFERENCES transfer_operators(id),
  booking_id VARCHAR(255),
  client_name VARCHAR(255) NOT NULL,
  client_phone VARCHAR(50) NOT NULL,
  client_email VARCHAR(255),
  vehicle_id UUID REFERENCES vehicles(id),
  driver_id UUID REFERENCES drivers(id),
  pickup_location VARCHAR(255) NOT NULL,
  dropoff_location VARCHAR(255) NOT NULL,
  pickup_date_time TIMESTAMPTZ NOT NULL,
  dropoff_date_time TIMESTAMPTZ,
  passengers INTEGER NOT NULL,
  luggage INTEGER DEFAULT 0,
  special_requests TEXT,
  price DECIMAL(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'scheduled',
  payment_status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  actual_pickup_time TIMESTAMPTZ,
  actual_dropoff_time TIMESTAMPTZ,
  distance DECIMAL(10,2),
  duration INTEGER,
  rating DECIMAL(3,2),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transfers_operator_id ON transfers(operator_id);
CREATE INDEX idx_transfers_driver_id ON transfers(driver_id);
CREATE INDEX idx_transfers_vehicle_id ON transfers(vehicle_id);
CREATE INDEX idx_transfers_status ON transfers(status);
CREATE INDEX idx_transfers_pickup_date ON transfers(pickup_date_time);

-- Таблица расписания водителей
CREATE TABLE IF NOT EXISTS driver_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id),
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location VARCHAR(255),
  transfer_id UUID REFERENCES transfers(id),
  type VARCHAR(50) DEFAULT 'available',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_driver_schedules_driver_date ON driver_schedules(driver_id, date);

-- Таблица заявок на трансфер
CREATE TABLE IF NOT EXISTS transfer_requests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operator_id UUID REFERENCES transfer_operators(id),
  client_name VARCHAR(255) NOT NULL,
  client_phone VARCHAR(50) NOT NULL,
  client_email VARCHAR(255),
  pickup_location VARCHAR(255) NOT NULL,
  dropoff_location VARCHAR(255) NOT NULL,
  pickup_date_time TIMESTAMPTZ NOT NULL,
  passengers INTEGER NOT NULL,
  luggage INTEGER DEFAULT 0,
  vehicle_type VARCHAR(50),
  status VARCHAR(50) DEFAULT 'pending',
  assigned_vehicle_id UUID REFERENCES vehicles(id),
  assigned_driver_id UUID REFERENCES drivers(id),
  estimated_price DECIMAL(10,2),
  final_price DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_transfer_requests_operator_id ON transfer_requests(operator_id);
CREATE INDEX idx_transfer_requests_status ON transfer_requests(status);

\echo '✓ Transfer Operator таблицы созданы'

