-- Migration: Transfer System Tables
-- Date: 2025-11-10
-- Purpose: Complete transfer operator system implementation

-- ============================================
-- VEHICLES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS vehicles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operator_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL CHECK (type IN ('car', 'minivan', 'bus', 'helicopter', 'boat')),
  license_plate VARCHAR(50) UNIQUE NOT NULL,
  capacity INTEGER NOT NULL CHECK (capacity > 0),
  category VARCHAR(50) DEFAULT 'economy' CHECK (category IN ('economy', 'comfort', 'business', 'premium')),
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive')),
  location VARCHAR(255),
  features JSONB DEFAULT '[]',
  images JSONB DEFAULT '[]',
  purchase_date DATE,
  last_service_date DATE,
  next_service_date DATE,
  mileage INTEGER DEFAULT 0,
  fuel_type VARCHAR(50),
  year INTEGER,
  color VARCHAR(50),
  vin VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- VEHICLE DOCUMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS vehicle_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('insurance', 'registration', 'inspection', 'license', 'other')),
  name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  document_number VARCHAR(100),
  issue_date DATE,
  expiry_date DATE,
  issuing_authority VARCHAR(255),
  status VARCHAR(20) DEFAULT 'valid' CHECK (status IN ('valid', 'expiring', 'expired')),
  notes TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DRIVERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS drivers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operator_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  first_name VARCHAR(255) NOT NULL,
  last_name VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255),
  date_of_birth DATE,
  license_number VARCHAR(100) NOT NULL,
  license_category VARCHAR(50),
  license_issue_date DATE,
  license_expiry DATE NOT NULL,
  experience INTEGER DEFAULT 0,
  languages JSONB DEFAULT '[]',
  rating DECIMAL(3,2) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
  total_trips INTEGER DEFAULT 0,
  completed_trips INTEGER DEFAULT 0,
  cancelled_trips INTEGER DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended', 'on_leave')),
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  emergency_contact JSONB,
  address TEXT,
  city VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100) DEFAULT 'Russia',
  hire_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DRIVER DOCUMENTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS driver_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('license', 'passport', 'medical', 'background_check', 'contract', 'other')),
  name VARCHAR(255) NOT NULL,
  file_url TEXT NOT NULL,
  document_number VARCHAR(100),
  issue_date DATE,
  expiry_date DATE,
  issuing_authority VARCHAR(255),
  status VARCHAR(20) DEFAULT 'valid' CHECK (status IN ('valid', 'expiring', 'expired')),
  notes TEXT,
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRANSFER ROUTES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS transfer_routes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operator_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  from_location VARCHAR(255) NOT NULL,
  to_location VARCHAR(255) NOT NULL,
  from_coordinates JSONB,
  to_coordinates JSONB,
  distance DECIMAL(10,2),
  estimated_duration INTEGER,
  base_price DECIMAL(10,2) NOT NULL,
  price_per_km DECIMAL(10,2),
  price_per_hour DECIMAL(10,2),
  popular BOOLEAN DEFAULT FALSE,
  transfers_count INTEGER DEFAULT 0,
  average_rating DECIMAL(3,2) DEFAULT 0.0,
  is_active BOOLEAN DEFAULT TRUE,
  weather_dependent BOOLEAN DEFAULT FALSE,
  stops JSONB DEFAULT '[]',
  description TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRANSFERS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS transfers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_reference VARCHAR(100) NOT NULL UNIQUE,
  operator_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  route_id UUID REFERENCES transfer_routes(id) ON DELETE SET NULL,
  client_name VARCHAR(255) NOT NULL,
  client_phone VARCHAR(50) NOT NULL,
  client_email VARCHAR(255),
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  pickup_location TEXT NOT NULL,
  pickup_coordinates JSONB,
  dropoff_location TEXT NOT NULL,
  dropoff_coordinates JSONB,
  pickup_datetime TIMESTAMPTZ NOT NULL,
  dropoff_datetime TIMESTAMPTZ,
  passengers INTEGER NOT NULL CHECK (passengers > 0),
  luggage INTEGER DEFAULT 0,
  special_requests TEXT,
  price DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'RUB',
  status VARCHAR(50) DEFAULT 'scheduled' CHECK (status IN ('pending', 'assigned', 'confirmed', 'in_progress', 'completed', 'cancelled', 'delayed')),
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded', 'partially_refunded')),
  payment_method VARCHAR(50),
  notes TEXT,
  actual_pickup_time TIMESTAMPTZ,
  actual_dropoff_time TIMESTAMPTZ,
  actual_distance DECIMAL(10,2),
  actual_duration INTEGER,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback TEXT,
  cancellation_reason TEXT,
  cancelled_by VARCHAR(50),
  cancelled_at TIMESTAMPTZ,
  assigned_at TIMESTAMPTZ,
  confirmed_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- DRIVER SCHEDULES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS driver_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  location VARCHAR(255),
  transfer_id UUID REFERENCES transfers(id) ON DELETE SET NULL,
  type VARCHAR(50) DEFAULT 'available' CHECK (type IN ('available', 'booked', 'maintenance', 'off', 'sick', 'vacation')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(driver_id, date, start_time)
);

-- ============================================
-- TRANSFER TRANSACTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS transfer_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  operator_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN ('booking', 'refund', 'fuel', 'maintenance', 'driver_payment', 'insurance', 'fine', 'other')),
  amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'RUB',
  description TEXT,
  date DATE NOT NULL,
  transfer_id UUID REFERENCES transfers(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES drivers(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE SET NULL,
  payment_method VARCHAR(50),
  reference_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- TRANSFER REVIEWS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS transfer_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  transfer_id UUID NOT NULL REFERENCES transfers(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  driver_id UUID NOT NULL REFERENCES drivers(id) ON DELETE CASCADE,
  vehicle_id UUID NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  driver_rating INTEGER CHECK (driver_rating >= 1 AND driver_rating <= 5),
  vehicle_rating INTEGER CHECK (vehicle_rating >= 1 AND vehicle_rating <= 5),
  punctuality_rating INTEGER CHECK (punctuality_rating >= 1 AND punctuality_rating <= 5),
  comment TEXT,
  operator_reply TEXT,
  operator_reply_at TIMESTAMPTZ,
  is_verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(transfer_id, user_id)
);

-- ============================================
-- INDEXES
-- ============================================

-- Vehicles
CREATE INDEX IF NOT EXISTS idx_vehicles_operator_id ON vehicles(operator_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_status ON vehicles(status);
CREATE INDEX IF NOT EXISTS idx_vehicles_type ON vehicles(type);
CREATE INDEX IF NOT EXISTS idx_vehicles_license_plate ON vehicles(license_plate);

-- Vehicle Documents
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_vehicle_id ON vehicle_documents(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_status ON vehicle_documents(status);
CREATE INDEX IF NOT EXISTS idx_vehicle_documents_expiry ON vehicle_documents(expiry_date);

-- Drivers
CREATE INDEX IF NOT EXISTS idx_drivers_operator_id ON drivers(operator_id);
CREATE INDEX IF NOT EXISTS idx_drivers_status ON drivers(status);
CREATE INDEX IF NOT EXISTS idx_drivers_vehicle_id ON drivers(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_drivers_license_number ON drivers(license_number);
CREATE INDEX IF NOT EXISTS idx_drivers_rating ON drivers(rating);

-- Driver Documents
CREATE INDEX IF NOT EXISTS idx_driver_documents_driver_id ON driver_documents(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_documents_status ON driver_documents(status);
CREATE INDEX IF NOT EXISTS idx_driver_documents_expiry ON driver_documents(expiry_date);

-- Routes
CREATE INDEX IF NOT EXISTS idx_transfer_routes_operator_id ON transfer_routes(operator_id);
CREATE INDEX IF NOT EXISTS idx_transfer_routes_is_active ON transfer_routes(is_active);
CREATE INDEX IF NOT EXISTS idx_transfer_routes_popular ON transfer_routes(popular);
CREATE INDEX IF NOT EXISTS idx_transfer_routes_from_to ON transfer_routes(from_location, to_location);

-- Transfers
CREATE INDEX IF NOT EXISTS idx_transfers_operator_id ON transfers(operator_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_payment_status ON transfers(payment_status);
CREATE INDEX IF NOT EXISTS idx_transfers_vehicle_id ON transfers(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_transfers_driver_id ON transfers(driver_id);
CREATE INDEX IF NOT EXISTS idx_transfers_user_id ON transfers(user_id);
CREATE INDEX IF NOT EXISTS idx_transfers_booking_reference ON transfers(booking_reference);
CREATE INDEX IF NOT EXISTS idx_transfers_pickup_datetime ON transfers(pickup_datetime);
CREATE INDEX IF NOT EXISTS idx_transfers_created_at ON transfers(created_at DESC);

-- Schedules
CREATE INDEX IF NOT EXISTS idx_driver_schedules_driver_id ON driver_schedules(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_schedules_date ON driver_schedules(date);
CREATE INDEX IF NOT EXISTS idx_driver_schedules_transfer_id ON driver_schedules(transfer_id);
CREATE INDEX IF NOT EXISTS idx_driver_schedules_type ON driver_schedules(type);

-- Transactions
CREATE INDEX IF NOT EXISTS idx_transfer_transactions_operator_id ON transfer_transactions(operator_id);
CREATE INDEX IF NOT EXISTS idx_transfer_transactions_type ON transfer_transactions(type);
CREATE INDEX IF NOT EXISTS idx_transfer_transactions_date ON transfer_transactions(date);
CREATE INDEX IF NOT EXISTS idx_transfer_transactions_transfer_id ON transfer_transactions(transfer_id);

-- Reviews
CREATE INDEX IF NOT EXISTS idx_transfer_reviews_transfer_id ON transfer_reviews(transfer_id);
CREATE INDEX IF NOT EXISTS idx_transfer_reviews_driver_id ON transfer_reviews(driver_id);
CREATE INDEX IF NOT EXISTS idx_transfer_reviews_vehicle_id ON transfer_reviews(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_transfer_reviews_rating ON transfer_reviews(rating);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE TRIGGER update_vehicles_updated_at 
  BEFORE UPDATE ON vehicles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_drivers_updated_at 
  BEFORE UPDATE ON drivers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transfer_routes_updated_at 
  BEFORE UPDATE ON transfer_routes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transfers_updated_at 
  BEFORE UPDATE ON transfers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_driver_schedules_updated_at 
  BEFORE UPDATE ON driver_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transfer_reviews_updated_at 
  BEFORE UPDATE ON transfer_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-update document status based on expiry date
CREATE OR REPLACE FUNCTION update_document_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.expiry_date IS NOT NULL THEN
    IF NEW.expiry_date < CURRENT_DATE THEN
      NEW.status := 'expired';
    ELSIF NEW.expiry_date <= CURRENT_DATE + INTERVAL '30 days' THEN
      NEW.status := 'expiring';
    ELSE
      NEW.status := 'valid';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_vehicle_document_status
  BEFORE INSERT OR UPDATE ON vehicle_documents
  FOR EACH ROW EXECUTE FUNCTION update_document_status();

CREATE TRIGGER update_driver_document_status
  BEFORE INSERT OR UPDATE ON driver_documents
  FOR EACH ROW EXECUTE FUNCTION update_document_status();

-- Auto-update driver stats after transfer completion
CREATE OR REPLACE FUNCTION update_driver_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    UPDATE drivers 
    SET 
      completed_trips = completed_trips + 1,
      total_trips = total_trips + 1,
      rating = (
        SELECT COALESCE(AVG(rating), 0)
        FROM transfer_reviews
        WHERE driver_id = NEW.driver_id
      )
    WHERE id = NEW.driver_id;
  ELSIF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE drivers 
    SET 
      cancelled_trips = cancelled_trips + 1,
      total_trips = total_trips + 1
    WHERE id = NEW.driver_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_driver_stats_on_transfer
  AFTER UPDATE ON transfers
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION update_driver_stats();

-- Auto-update route stats
CREATE OR REPLACE FUNCTION update_route_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.route_id IS NOT NULL THEN
    UPDATE transfer_routes 
    SET 
      transfers_count = (
        SELECT COUNT(*) 
        FROM transfers 
        WHERE route_id = NEW.route_id
      ),
      average_rating = (
        SELECT COALESCE(AVG(rating), 0)
        FROM transfers
        WHERE route_id = NEW.route_id AND rating IS NOT NULL
      )
    WHERE id = NEW.route_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_route_stats_on_transfer
  AFTER INSERT OR UPDATE ON transfers
  FOR EACH ROW
  WHEN (NEW.route_id IS NOT NULL)
  EXECUTE FUNCTION update_route_stats();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE vehicles IS 'Transport vehicles managed by transfer operators';
COMMENT ON TABLE vehicle_documents IS 'Legal documents for vehicles (insurance, registration, etc)';
COMMENT ON TABLE drivers IS 'Drivers employed by transfer operators';
COMMENT ON TABLE driver_documents IS 'Legal documents for drivers (license, medical, etc)';
COMMENT ON TABLE transfer_routes IS 'Popular transfer routes with pricing';
COMMENT ON TABLE transfers IS 'Individual transfer bookings and rides';
COMMENT ON TABLE driver_schedules IS 'Driver availability and booking schedule';
COMMENT ON TABLE transfer_transactions IS 'Financial transactions for transfers';
COMMENT ON TABLE transfer_reviews IS 'Customer reviews for transfers';

COMMENT ON COLUMN vehicles.status IS 'active: ready for use, maintenance: under service, inactive: not in service';
COMMENT ON COLUMN drivers.status IS 'active: working, inactive: not working, suspended: temporarily banned, on_leave: vacation';
COMMENT ON COLUMN transfers.status IS 'pending: awaiting assignment, assigned: driver assigned, confirmed: confirmed by client, in_progress: ongoing, completed: finished, cancelled: cancelled, delayed: delayed';
COMMENT ON COLUMN driver_schedules.type IS 'available: free, booked: has transfer, maintenance: vehicle maintenance, off: day off, sick: sick leave, vacation: vacation';
