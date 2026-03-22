-- Migration: Car Rental System
-- Date: 2025-11-10
-- Purpose: Complete car rental system with validation and dependencies

-- ============================================
-- CARS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS cars (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  brand VARCHAR(100) NOT NULL,
  model VARCHAR(100) NOT NULL,
  year INTEGER NOT NULL CHECK (year >= 1990 AND year <= EXTRACT(YEAR FROM CURRENT_DATE) + 1),
  vin VARCHAR(17) UNIQUE,
  license_plate VARCHAR(20) NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('economy', 'comfort', 'business', 'suv', 'luxury', 'minivan')),
  body_type VARCHAR(30) CHECK (body_type IN ('sedan', 'hatchback', 'wagon', 'suv', 'crossover', 'minivan', 'pickup')),
  transmission VARCHAR(20) NOT NULL CHECK (transmission IN ('manual', 'automatic', 'robot', 'cvt')),
  fuel_type VARCHAR(20) NOT NULL CHECK (fuel_type IN ('petrol', 'diesel', 'hybrid', 'electric', 'gas')),
  engine_volume DECIMAL(3,1) CHECK (engine_volume > 0 AND engine_volume < 10),
  power INTEGER CHECK (power > 0 AND power < 1000),
  drive_type VARCHAR(10) CHECK (drive_type IN ('fwd', 'rwd', 'awd', '4wd')),
  seats INTEGER NOT NULL CHECK (seats >= 2 AND seats <= 9),
  doors INTEGER NOT NULL CHECK (doors >= 2 AND doors <= 5),
  color VARCHAR(50),
  mileage INTEGER DEFAULT 0 CHECK (mileage >= 0),
  price_per_day DECIMAL(10,2) NOT NULL CHECK (price_per_day > 0),
  price_per_week DECIMAL(10,2) CHECK (price_per_week IS NULL OR price_per_week > 0),
  price_per_month DECIMAL(10,2) CHECK (price_per_month IS NULL OR price_per_month > 0),
  currency VARCHAR(3) DEFAULT 'RUB',
  images JSONB DEFAULT '[]',
  features JSONB DEFAULT '[]',
  specifications JSONB DEFAULT '{}',
  condition VARCHAR(20) DEFAULT 'excellent' CHECK (condition IN ('excellent', 'good', 'fair')),
  deposit_amount DECIMAL(10,2) NOT NULL CHECK (deposit_amount >= 0),
  min_driver_age INTEGER DEFAULT 21 CHECK (min_driver_age >= 18 AND min_driver_age <= 70),
  min_driver_experience INTEGER DEFAULT 2 CHECK (min_driver_experience >= 0 AND min_driver_experience <= 50),
  insurance_included BOOLEAN DEFAULT TRUE,
  insurance_daily_cost DECIMAL(10,2) DEFAULT 0 CHECK (insurance_daily_cost >= 0),
  mileage_limit_per_day INTEGER CHECK (mileage_limit_per_day IS NULL OR mileage_limit_per_day > 0),
  extra_mileage_cost DECIMAL(10,2) CHECK (extra_mileage_cost IS NULL OR extra_mileage_cost >= 0),
  location_address TEXT,
  pickup_instructions TEXT,
  return_instructions TEXT,
  restrictions TEXT,
  quantity INTEGER DEFAULT 1 CHECK (quantity > 0),
  available_quantity INTEGER DEFAULT 1 CHECK (available_quantity >= 0),
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  rating DECIMAL(3,2) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
  review_count INTEGER DEFAULT 0 CHECK (review_count >= 0),
  rental_count INTEGER DEFAULT 0 CHECK (rental_count >= 0),
  total_revenue DECIMAL(12,2) DEFAULT 0.0 CHECK (total_revenue >= 0),
  last_service_date DATE,
  next_service_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_quantity_consistency CHECK (available_quantity <= quantity),
  CONSTRAINT check_service_dates CHECK (next_service_date IS NULL OR last_service_date IS NULL OR next_service_date > last_service_date)
);

-- ============================================
-- CAR RENTALS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS car_rentals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_number VARCHAR(50) UNIQUE NOT NULL,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  driver_license_number VARCHAR(50) NOT NULL,
  driver_license_issue_date DATE,
  driver_license_expiry_date DATE NOT NULL,
  driver_birth_date DATE NOT NULL,
  additional_driver_name VARCHAR(255),
  additional_driver_license VARCHAR(50),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL CHECK (total_days > 0),
  pickup_location VARCHAR(255) NOT NULL,
  return_location VARCHAR(255) NOT NULL,
  pickup_datetime TIMESTAMPTZ,
  return_datetime TIMESTAMPTZ,
  actual_return_datetime TIMESTAMPTZ,
  mileage_start INTEGER CHECK (mileage_start >= 0),
  mileage_end INTEGER CHECK (mileage_end IS NULL OR mileage_end >= mileage_start),
  rental_cost DECIMAL(10,2) NOT NULL CHECK (rental_cost >= 0),
  deposit_amount DECIMAL(10,2) NOT NULL CHECK (deposit_amount >= 0),
  insurance_cost DECIMAL(10,2) DEFAULT 0 CHECK (insurance_cost >= 0),
  additional_driver_cost DECIMAL(10,2) DEFAULT 0 CHECK (additional_driver_cost >= 0),
  gps_cost DECIMAL(10,2) DEFAULT 0 CHECK (gps_cost >= 0),
  child_seat_cost DECIMAL(10,2) DEFAULT 0 CHECK (child_seat_cost >= 0),
  extra_mileage_cost DECIMAL(10,2) DEFAULT 0 CHECK (extra_mileage_cost >= 0),
  fuel_cost DECIMAL(10,2) DEFAULT 0 CHECK (fuel_cost >= 0),
  damage_cost DECIMAL(10,2) DEFAULT 0 CHECK (damage_cost >= 0),
  late_return_fee DECIMAL(10,2) DEFAULT 0 CHECK (late_return_fee >= 0),
  total_amount DECIMAL(10,2) NOT NULL CHECK (total_amount >= 0),
  deposit_paid BOOLEAN DEFAULT FALSE,
  deposit_refunded BOOLEAN DEFAULT FALSE,
  deposit_refund_amount DECIMAL(10,2) CHECK (deposit_refund_amount IS NULL OR (deposit_refund_amount >= 0 AND deposit_refund_amount <= deposit_amount)),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled', 'overdue')),
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')),
  payment_method VARCHAR(50),
  payment_reference TEXT,
  includes_gps BOOLEAN DEFAULT FALSE,
  includes_child_seat BOOLEAN DEFAULT FALSE,
  fuel_policy VARCHAR(20) DEFAULT 'full_to_full' CHECK (fuel_policy IN ('full_to_full', 'same_to_same', 'prepaid')),
  fuel_level_pickup INTEGER CHECK (fuel_level_pickup >= 0 AND fuel_level_pickup <= 100),
  fuel_level_return INTEGER CHECK (fuel_level_return IS NULL OR (fuel_level_return >= 0 AND fuel_level_return <= 100)),
  condition_before TEXT,
  condition_after TEXT,
  damage_notes TEXT,
  pickup_notes TEXT,
  return_notes TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT check_dates CHECK (end_date > start_date),
  CONSTRAINT check_return_datetime CHECK (actual_return_datetime IS NULL OR actual_return_datetime >= pickup_datetime),
  CONSTRAINT check_driver_age CHECK (EXTRACT(YEAR FROM AGE(start_date, driver_birth_date)) >= 18)
);

-- ============================================
-- CAR AVAILABILITY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS car_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_quantity INTEGER NOT NULL CHECK (total_quantity > 0),
  rented_quantity INTEGER DEFAULT 0 CHECK (rented_quantity >= 0),
  available_quantity INTEGER NOT NULL CHECK (available_quantity >= 0),
  is_available BOOLEAN GENERATED ALWAYS AS (available_quantity > 0) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(car_id, date),
  CHECK (rented_quantity + available_quantity = total_quantity)
);

-- ============================================
-- CAR REVIEWS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS car_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  rental_id UUID REFERENCES car_rentals(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  cleanliness_rating INTEGER CHECK (cleanliness_rating BETWEEN 1 AND 5),
  comfort_rating INTEGER CHECK (comfort_rating BETWEEN 1 AND 5),
  performance_rating INTEGER CHECK (performance_rating BETWEEN 1 AND 5),
  value_rating INTEGER CHECK (value_rating BETWEEN 1 AND 5),
  comment TEXT,
  pros TEXT,
  cons TEXT,
  partner_reply TEXT,
  partner_reply_at TIMESTAMPTZ,
  is_verified BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT TRUE,
  helpful_count INTEGER DEFAULT 0 CHECK (helpful_count >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rental_id, user_id)
);

-- ============================================
-- CAR MAINTENANCE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS car_maintenance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  maintenance_type VARCHAR(50) NOT NULL CHECK (maintenance_type IN ('routine', 'repair', 'inspection', 'tire_change', 'oil_change', 'cleaning')),
  description TEXT NOT NULL,
  cost DECIMAL(10,2) DEFAULT 0 CHECK (cost >= 0),
  mileage_at_service INTEGER CHECK (mileage_at_service >= 0),
  performed_by VARCHAR(255),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  next_service_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- CAR DAMAGE REPORTS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS car_damage_reports (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id UUID NOT NULL REFERENCES car_rentals(id) ON DELETE CASCADE,
  car_id UUID NOT NULL REFERENCES cars(id) ON DELETE CASCADE,
  reported_by VARCHAR(50) CHECK (reported_by IN ('partner', 'customer', 'system')),
  damage_type VARCHAR(50) CHECK (damage_type IN ('scratch', 'dent', 'broken_part', 'interior', 'mechanical', 'other')),
  severity VARCHAR(20) CHECK (severity IN ('minor', 'moderate', 'major')),
  description TEXT NOT NULL,
  location_on_car TEXT,
  repair_cost DECIMAL(10,2) DEFAULT 0 CHECK (repair_cost >= 0),
  customer_liable BOOLEAN DEFAULT FALSE,
  insurance_claim BOOLEAN DEFAULT FALSE,
  photos JSONB DEFAULT '[]',
  status VARCHAR(20) DEFAULT 'reported' CHECK (status IN ('reported', 'assessed', 'repaired', 'closed')),
  reported_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Cars
CREATE INDEX IF NOT EXISTS idx_cars_partner_id ON cars(partner_id);
CREATE INDEX IF NOT EXISTS idx_cars_brand_model ON cars(brand, model);
CREATE INDEX IF NOT EXISTS idx_cars_category ON cars(category);
CREATE INDEX IF NOT EXISTS idx_cars_transmission ON cars(transmission);
CREATE INDEX IF NOT EXISTS idx_cars_fuel_type ON cars(fuel_type);
CREATE INDEX IF NOT EXISTS idx_cars_seats ON cars(seats);
CREATE INDEX IF NOT EXISTS idx_cars_price ON cars(price_per_day);
CREATE INDEX IF NOT EXISTS idx_cars_is_active ON cars(is_active);
CREATE INDEX IF NOT EXISTS idx_cars_rating ON cars(rating);
CREATE INDEX IF NOT EXISTS idx_cars_license_plate ON cars(license_plate);

-- Car rentals
CREATE INDEX IF NOT EXISTS idx_car_rentals_partner_id ON car_rentals(partner_id);
CREATE INDEX IF NOT EXISTS idx_car_rentals_car_id ON car_rentals(car_id);
CREATE INDEX IF NOT EXISTS idx_car_rentals_user_id ON car_rentals(user_id);
CREATE INDEX IF NOT EXISTS idx_car_rentals_status ON car_rentals(status);
CREATE INDEX IF NOT EXISTS idx_car_rentals_payment_status ON car_rentals(payment_status);
CREATE INDEX IF NOT EXISTS idx_car_rentals_dates ON car_rentals(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_car_rentals_rental_number ON car_rentals(rental_number);

-- Car availability
CREATE INDEX IF NOT EXISTS idx_car_availability_car_date ON car_availability(car_id, date);
CREATE INDEX IF NOT EXISTS idx_car_availability_date ON car_availability(date);

-- Car reviews
CREATE INDEX IF NOT EXISTS idx_car_reviews_car_id ON car_reviews(car_id);
CREATE INDEX IF NOT EXISTS idx_car_reviews_user_id ON car_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_car_reviews_rating ON car_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_car_reviews_is_public ON car_reviews(is_public);

-- Car maintenance
CREATE INDEX IF NOT EXISTS idx_car_maintenance_car_id ON car_maintenance(car_id);
CREATE INDEX IF NOT EXISTS idx_car_maintenance_type ON car_maintenance(maintenance_type);
CREATE INDEX IF NOT EXISTS idx_car_maintenance_date ON car_maintenance(performed_at);

-- Damage reports
CREATE INDEX IF NOT EXISTS idx_car_damage_rental_id ON car_damage_reports(rental_id);
CREATE INDEX IF NOT EXISTS idx_car_damage_car_id ON car_damage_reports(car_id);
CREATE INDEX IF NOT EXISTS idx_car_damage_status ON car_damage_reports(status);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE TRIGGER update_cars_updated_at
  BEFORE UPDATE ON cars
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_car_rentals_updated_at
  BEFORE UPDATE ON car_rentals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_car_reviews_updated_at
  BEFORE UPDATE ON car_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION: Generate rental number
-- ============================================

CREATE OR REPLACE FUNCTION generate_car_rental_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rental_number IS NULL THEN
    NEW.rental_number := 'CR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('car_rental_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS car_rental_number_seq START 1;

CREATE TRIGGER trigger_generate_car_rental_number
  BEFORE INSERT ON car_rentals
  FOR EACH ROW
  EXECUTE FUNCTION generate_car_rental_number();

-- ============================================
-- FUNCTION: Update car rating
-- ============================================

CREATE OR REPLACE FUNCTION update_car_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE cars
  SET 
    rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM car_reviews
      WHERE car_id = NEW.car_id AND is_public = TRUE
    ),
    review_count = (
      SELECT COUNT(*)
      FROM car_reviews
      WHERE car_id = NEW.car_id AND is_public = TRUE
    )
  WHERE id = NEW.car_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_car_rating
  AFTER INSERT OR UPDATE ON car_reviews
  FOR EACH ROW
  WHEN (NEW.is_public = TRUE)
  EXECUTE FUNCTION update_car_rating();

-- ============================================
-- FUNCTION: Update availability on rental
-- ============================================

CREATE OR REPLACE FUNCTION update_car_availability_on_rental()
RETURNS TRIGGER AS $$
DECLARE
  rental_date DATE;
BEGIN
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    FOR rental_date IN SELECT generate_series(NEW.start_date, NEW.end_date - INTERVAL '1 day', '1 day'::interval)::DATE LOOP
      INSERT INTO car_availability (car_id, date, total_quantity, rented_quantity, available_quantity)
      SELECT 
        NEW.car_id,
        rental_date,
        c.quantity,
        1,
        c.quantity - 1
      FROM cars c
      WHERE c.id = NEW.car_id
      ON CONFLICT (car_id, date) DO UPDATE
      SET 
        rented_quantity = car_availability.rented_quantity + 1,
        available_quantity = car_availability.available_quantity - 1;
    END LOOP;
  ELSIF (NEW.status IN ('cancelled', 'completed')) AND OLD.status = 'confirmed' THEN
    FOR rental_date IN SELECT generate_series(OLD.start_date, OLD.end_date - INTERVAL '1 day', '1 day'::interval)::DATE LOOP
      UPDATE car_availability
      SET 
        rented_quantity = rented_quantity - 1,
        available_quantity = available_quantity + 1
      WHERE car_id = NEW.car_id AND date = rental_date;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_car_availability
  AFTER INSERT OR UPDATE ON car_rentals
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status OR OLD.status IS NULL)
  EXECUTE FUNCTION update_car_availability_on_rental();

-- ============================================
-- FUNCTION: Update car revenue
-- ============================================

CREATE OR REPLACE FUNCTION update_car_revenue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    UPDATE cars
    SET 
      rental_count = rental_count + 1,
      total_revenue = total_revenue + NEW.rental_cost
    WHERE id = NEW.car_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_car_revenue
  AFTER UPDATE ON car_rentals
  FOR EACH ROW
  WHEN (NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid'))
  EXECUTE FUNCTION update_car_revenue();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE cars IS 'Cars available for rent with complete specifications and validation';
COMMENT ON TABLE car_rentals IS 'Car rental bookings with driver validation and costs breakdown';
COMMENT ON TABLE car_availability IS 'Daily availability tracking with auto-computed is_available';
COMMENT ON TABLE car_reviews IS 'Customer reviews with detailed ratings';
COMMENT ON TABLE car_maintenance IS 'Maintenance history and scheduling';
COMMENT ON TABLE car_damage_reports IS 'Damage reports with insurance claims tracking';

COMMENT ON CONSTRAINT check_driver_age ON car_rentals IS 'Driver must be at least 18 years old';
COMMENT ON CONSTRAINT check_dates ON car_rentals IS 'End date must be after start date';
COMMENT ON CONSTRAINT check_quantity_consistency ON cars IS 'Available quantity cannot exceed total quantity';
