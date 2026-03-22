-- Migration: Gear Rental System
-- Date: 2025-11-10
-- Purpose: Complete gear rental system for partners

-- ============================================
-- GEAR ITEMS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS gear_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(50) NOT NULL,
  subcategory VARCHAR(100),
  brand VARCHAR(100),
  model VARCHAR(100),
  size VARCHAR(50),
  color VARCHAR(50),
  weight DECIMAL(8,2), -- kg
  price_per_day DECIMAL(10,2) NOT NULL,
  price_per_week DECIMAL(10,2),
  price_per_month DECIMAL(10,2),
  currency VARCHAR(3) DEFAULT 'RUB',
  images JSONB DEFAULT '[]',
  specifications JSONB DEFAULT '{}',
  features JSONB DEFAULT '[]',
  condition VARCHAR(20) DEFAULT 'excellent' CHECK (condition IN ('excellent', 'good', 'fair', 'needs_repair')),
  quantity INTEGER DEFAULT 1 CHECK (quantity >= 0),
  available_quantity INTEGER DEFAULT 1 CHECK (available_quantity >= 0),
  requires_deposit BOOLEAN DEFAULT TRUE,
  deposit_amount DECIMAL(10,2),
  requires_insurance BOOLEAN DEFAULT FALSE,
  insurance_cost_per_day DECIMAL(10,2),
  location_address TEXT,
  pickup_instructions TEXT,
  return_instructions TEXT,
  tags TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  is_featured BOOLEAN DEFAULT FALSE,
  rating DECIMAL(3,2) DEFAULT 0.0 CHECK (rating >= 0 AND rating <= 5),
  review_count INTEGER DEFAULT 0,
  rental_count INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- GEAR RENTALS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS gear_rentals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_number VARCHAR(50) UNIQUE NOT NULL,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_email VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  customer_id_document VARCHAR(100), -- паспорт для залога
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days INTEGER NOT NULL,
  rental_cost DECIMAL(10,2) NOT NULL,
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  insurance_cost DECIMAL(10,2) DEFAULT 0,
  total_amount DECIMAL(10,2) NOT NULL,
  deposit_paid BOOLEAN DEFAULT FALSE,
  deposit_refunded BOOLEAN DEFAULT FALSE,
  deposit_refund_amount DECIMAL(10,2),
  status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'active', 'completed', 'cancelled', 'overdue')),
  payment_status VARCHAR(50) DEFAULT 'pending' CHECK (payment_status IN ('pending', 'partial', 'paid', 'refunded')),
  payment_method VARCHAR(50),
  payment_reference TEXT,
  pickup_location VARCHAR(255),
  return_location VARCHAR(255),
  pickup_datetime TIMESTAMPTZ,
  return_datetime TIMESTAMPTZ,
  actual_return_datetime TIMESTAMPTZ,
  pickup_notes TEXT,
  return_notes TEXT,
  damage_notes TEXT,
  damage_cost DECIMAL(10,2) DEFAULT 0,
  late_fee DECIMAL(10,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- GEAR RENTAL ITEMS TABLE (many-to-many)
-- ============================================

CREATE TABLE IF NOT EXISTS gear_rental_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id UUID NOT NULL REFERENCES gear_rentals(id) ON DELETE CASCADE,
  gear_item_id UUID NOT NULL REFERENCES gear_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_per_day DECIMAL(10,2) NOT NULL,
  total_days INTEGER NOT NULL,
  subtotal DECIMAL(10,2) NOT NULL,
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  insurance_cost DECIMAL(10,2) DEFAULT 0,
  condition_before VARCHAR(20),
  condition_after VARCHAR(20),
  damage_description TEXT,
  damage_cost DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- GEAR AVAILABILITY TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS gear_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gear_item_id UUID NOT NULL REFERENCES gear_items(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  total_quantity INTEGER NOT NULL,
  rented_quantity INTEGER DEFAULT 0 CHECK (rented_quantity >= 0),
  available_quantity INTEGER NOT NULL CHECK (available_quantity >= 0),
  is_available BOOLEAN GENERATED ALWAYS AS (available_quantity > 0) STORED,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(gear_item_id, date),
  CHECK (rented_quantity + available_quantity = total_quantity)
);

-- ============================================
-- GEAR REVIEWS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS gear_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gear_item_id UUID NOT NULL REFERENCES gear_items(id) ON DELETE CASCADE,
  rental_id UUID REFERENCES gear_rentals(id) ON DELETE SET NULL,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  condition_rating INTEGER CHECK (condition_rating BETWEEN 1 AND 5),
  value_rating INTEGER CHECK (value_rating BETWEEN 1 AND 5),
  comment TEXT,
  pros TEXT,
  cons TEXT,
  partner_reply TEXT,
  partner_reply_at TIMESTAMPTZ,
  is_verified BOOLEAN DEFAULT FALSE,
  is_public BOOLEAN DEFAULT TRUE,
  helpful_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(rental_id, user_id)
);

-- ============================================
-- GEAR MAINTENANCE TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS gear_maintenance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  gear_item_id UUID NOT NULL REFERENCES gear_items(id) ON DELETE CASCADE,
  maintenance_type VARCHAR(50) NOT NULL CHECK (maintenance_type IN ('routine', 'repair', 'inspection', 'cleaning')),
  description TEXT NOT NULL,
  cost DECIMAL(10,2) DEFAULT 0,
  performed_by VARCHAR(255),
  performed_at TIMESTAMPTZ DEFAULT NOW(),
  next_maintenance_date DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================

-- Gear items
CREATE INDEX IF NOT EXISTS idx_gear_items_partner_id ON gear_items(partner_id);
CREATE INDEX IF NOT EXISTS idx_gear_items_category ON gear_items(category);
CREATE INDEX IF NOT EXISTS idx_gear_items_is_active ON gear_items(is_active);
CREATE INDEX IF NOT EXISTS idx_gear_items_price ON gear_items(price_per_day);
CREATE INDEX IF NOT EXISTS idx_gear_items_rating ON gear_items(rating);
CREATE INDEX IF NOT EXISTS idx_gear_items_tags ON gear_items USING GIN (tags);

-- Gear rentals
CREATE INDEX IF NOT EXISTS idx_gear_rentals_partner_id ON gear_rentals(partner_id);
CREATE INDEX IF NOT EXISTS idx_gear_rentals_user_id ON gear_rentals(user_id);
CREATE INDEX IF NOT EXISTS idx_gear_rentals_status ON gear_rentals(status);
CREATE INDEX IF NOT EXISTS idx_gear_rentals_payment_status ON gear_rentals(payment_status);
CREATE INDEX IF NOT EXISTS idx_gear_rentals_dates ON gear_rentals(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_gear_rentals_rental_number ON gear_rentals(rental_number);

-- Gear rental items
CREATE INDEX IF NOT EXISTS idx_gear_rental_items_rental_id ON gear_rental_items(rental_id);
CREATE INDEX IF NOT EXISTS idx_gear_rental_items_gear_id ON gear_rental_items(gear_item_id);

-- Gear availability
CREATE INDEX IF NOT EXISTS idx_gear_availability_item_date ON gear_availability(gear_item_id, date);
CREATE INDEX IF NOT EXISTS idx_gear_availability_date ON gear_availability(date);

-- Gear reviews
CREATE INDEX IF NOT EXISTS idx_gear_reviews_gear_id ON gear_reviews(gear_item_id);
CREATE INDEX IF NOT EXISTS idx_gear_reviews_user_id ON gear_reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_gear_reviews_rating ON gear_reviews(rating);
CREATE INDEX IF NOT EXISTS idx_gear_reviews_is_public ON gear_reviews(is_public);

-- Gear maintenance
CREATE INDEX IF NOT EXISTS idx_gear_maintenance_gear_id ON gear_maintenance(gear_item_id);
CREATE INDEX IF NOT EXISTS idx_gear_maintenance_type ON gear_maintenance(maintenance_type);

-- ============================================
-- TRIGGERS
-- ============================================

-- Auto-update updated_at
CREATE TRIGGER update_gear_items_updated_at
  BEFORE UPDATE ON gear_items
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gear_rentals_updated_at
  BEFORE UPDATE ON gear_rentals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gear_reviews_updated_at
  BEFORE UPDATE ON gear_reviews
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- FUNCTION: Update gear rating
-- ============================================

CREATE OR REPLACE FUNCTION update_gear_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE gear_items
  SET 
    rating = (
      SELECT COALESCE(AVG(rating), 0)
      FROM gear_reviews
      WHERE gear_item_id = NEW.gear_item_id AND is_public = TRUE
    ),
    review_count = (
      SELECT COUNT(*)
      FROM gear_reviews
      WHERE gear_item_id = NEW.gear_item_id AND is_public = TRUE
    )
  WHERE id = NEW.gear_item_id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_gear_rating
  AFTER INSERT OR UPDATE ON gear_reviews
  FOR EACH ROW
  WHEN (NEW.is_public = TRUE)
  EXECUTE FUNCTION update_gear_rating();

-- ============================================
-- FUNCTION: Update availability on rental
-- ============================================

CREATE OR REPLACE FUNCTION update_gear_availability_on_rental()
RETURNS TRIGGER AS $$
DECLARE
  rental_date DATE;
  item RECORD;
BEGIN
  -- When rental is confirmed, update availability
  IF NEW.status = 'confirmed' AND (OLD.status IS NULL OR OLD.status != 'confirmed') THEN
    FOR item IN SELECT gear_item_id, quantity FROM gear_rental_items WHERE rental_id = NEW.id LOOP
      FOR rental_date IN SELECT generate_series(NEW.start_date, NEW.end_date - INTERVAL '1 day', '1 day'::interval)::DATE LOOP
        INSERT INTO gear_availability (gear_item_id, date, total_quantity, rented_quantity, available_quantity)
        SELECT 
          item.gear_item_id,
          rental_date,
          gi.quantity,
          item.quantity,
          gi.quantity - item.quantity
        FROM gear_items gi
        WHERE gi.id = item.gear_item_id
        ON CONFLICT (gear_item_id, date) DO UPDATE
        SET 
          rented_quantity = gear_availability.rented_quantity + item.quantity,
          available_quantity = gear_availability.available_quantity - item.quantity;
      END LOOP;
    END LOOP;
  -- When rental is cancelled/completed, restore availability
  ELSIF (NEW.status IN ('cancelled', 'completed')) AND OLD.status = 'confirmed' THEN
    FOR item IN SELECT gear_item_id, quantity FROM gear_rental_items WHERE rental_id = NEW.id LOOP
      FOR rental_date IN SELECT generate_series(OLD.start_date, OLD.end_date - INTERVAL '1 day', '1 day'::interval)::DATE LOOP
        UPDATE gear_availability
        SET 
          rented_quantity = rented_quantity - item.quantity,
          available_quantity = available_quantity + item.quantity
        WHERE gear_item_id = item.gear_item_id AND date = rental_date;
      END LOOP;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_gear_availability
  AFTER INSERT OR UPDATE ON gear_rentals
  FOR EACH ROW
  WHEN (NEW.status IS DISTINCT FROM OLD.status OR OLD.status IS NULL)
  EXECUTE FUNCTION update_gear_availability_on_rental();

-- ============================================
-- FUNCTION: Generate rental number
-- ============================================

CREATE OR REPLACE FUNCTION generate_rental_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.rental_number IS NULL THEN
    NEW.rental_number := 'GR-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('gear_rental_number_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE SEQUENCE IF NOT EXISTS gear_rental_number_seq START 1;

CREATE TRIGGER trigger_generate_rental_number
  BEFORE INSERT ON gear_rentals
  FOR EACH ROW
  EXECUTE FUNCTION generate_rental_number();

-- ============================================
-- FUNCTION: Update gear revenue
-- ============================================

CREATE OR REPLACE FUNCTION update_gear_revenue()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    UPDATE gear_items gi
    SET 
      rental_count = gi.rental_count + gri.quantity,
      total_revenue = gi.total_revenue + gri.subtotal
    FROM gear_rental_items gri
    WHERE gri.rental_id = NEW.id AND gi.id = gri.gear_item_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_gear_revenue
  AFTER UPDATE ON gear_rentals
  FOR EACH ROW
  WHEN (NEW.payment_status = 'paid' AND OLD.payment_status != 'paid')
  EXECUTE FUNCTION update_gear_revenue();

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON TABLE gear_items IS 'Gear equipment items available for rent';
COMMENT ON TABLE gear_rentals IS 'Rental bookings for gear equipment';
COMMENT ON TABLE gear_rental_items IS 'Individual items in each rental booking';
COMMENT ON TABLE gear_availability IS 'Daily availability tracking for gear items';
COMMENT ON TABLE gear_reviews IS 'Customer reviews for gear equipment';
COMMENT ON TABLE gear_maintenance IS 'Maintenance history for gear equipment';

COMMENT ON COLUMN gear_items.condition IS 'excellent, good, fair, needs_repair';
COMMENT ON COLUMN gear_rentals.status IS 'pending, confirmed, active, completed, cancelled, overdue';
COMMENT ON COLUMN gear_availability.is_available IS 'Auto-computed: available_quantity > 0';
