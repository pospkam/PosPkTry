-- Migration 040: Operator Tools - Tour Management & Booking System
-- Created: 2026-03-17
-- Status: PHASE 1 MVP

BEGIN TRANSACTION;

-- ============================================================================
-- TABLE: operator_tours
-- Purpose: Tours managed by operators (МеСтечко, КамчатИнтур, etc)
-- ============================================================================

CREATE TABLE operator_tours (
  id BIGSERIAL PRIMARY KEY,
  operator_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,

  -- Basic info
  title VARCHAR(255) NOT NULL,
  description TEXT,
  slug VARCHAR(255),

  -- Classification (for search & filtering)
  location_type VARCHAR(50),        -- 'volcano', 'hot_spring', 'bay', 'lake', 'mountain', 'river', 'geyser', 'other'
  activity_type VARCHAR(50),        -- 'trekking', 'thermal', 'boat_trip', 'fishing', 'helicopter', 'jeep', 'other'
  location_name VARCHAR(255),       -- 'Kurilskoye Lake', 'Avachinsky Pass'
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),

  -- Pricing & Capacity
  base_price DECIMAL(10, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'RUB',
  max_participants INT NOT NULL DEFAULT 1,
  min_participants INT DEFAULT 1,
  duration_hours DECIMAL(5, 2),     -- 2.5, 8, 24, 72

  -- Duration classification
  duration_type VARCHAR(20),        -- 'day', 'half_day', 'multi_day'
  multi_day_count INT,              -- if multi_day: 3, 5, 7

  -- Seasonal
  season_start DATE,
  season_end DATE,
  seasonal_only BOOLEAN DEFAULT false,

  -- Weather dependency (for auto-cancellation)
  weather_dependent BOOLEAN DEFAULT true,
  min_visibility_m INT DEFAULT 1000,
  max_wind_kmh INT DEFAULT 30,
  max_precipitation_mm INT DEFAULT 2,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_published BOOLEAN DEFAULT false,  -- ready for tourists

  -- Metadata
  tags VARCHAR(255)[],              -- search tags
  notes TEXT,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),

  -- Constraints
  CONSTRAINT price_positive CHECK (base_price > 0),
  CONSTRAINT participants_valid CHECK (max_participants >= min_participants),
  UNIQUE(operator_id, slug)
);

CREATE INDEX idx_operator_tours_operator_id ON operator_tours(operator_id);
CREATE INDEX idx_operator_tours_is_active ON operator_tours(is_active);
CREATE INDEX idx_operator_tours_published ON operator_tours(is_published);
CREATE INDEX idx_operator_tours_location ON operator_tours(location_type, activity_type);
CREATE INDEX idx_operator_tours_season ON operator_tours(season_start, season_end);

-- ============================================================================
-- TABLE: tour_availability
-- Purpose: Calendar slots - available dates & prices for each tour
-- ============================================================================

CREATE TABLE tour_availability (
  id BIGSERIAL PRIMARY KEY,
  operator_tour_id BIGINT NOT NULL REFERENCES operator_tours(id) ON DELETE CASCADE,

  -- Date
  date DATE NOT NULL,
  day_of_week INT,                  -- 0=Mon, 6=Sun (computed from date)

  -- Capacity management
  available_slots INT NOT NULL,     -- max how many can book
  booked_slots INT DEFAULT 0,       -- how many booked

  -- Pricing override (if different from operator_tours.base_price)
  base_price_override DECIMAL(10, 2),

  -- Weather status
  weather_status VARCHAR(20) DEFAULT 'unknown',
    -- 'unknown', 'ok', 'alert', 'cancelled'
  weather_data JSONB,               -- {temp, wind, precip, visibility, risk_type}
  weather_check_time TIMESTAMP,

  -- If cancelled
  is_cancelled BOOLEAN DEFAULT false,
  cancellation_reason VARCHAR(255),

  -- Contingency suggestions
  suggested_alternatives BIGINT[],  -- array of alternative tour IDs

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT slots_valid CHECK (available_slots > 0),
  CONSTRAINT booked_valid CHECK (booked_slots >= 0 AND booked_slots <= available_slots),
  UNIQUE(operator_tour_id, date)
);

CREATE INDEX idx_tour_availability_date ON tour_availability(date);
CREATE INDEX idx_tour_availability_tour ON tour_availability(operator_tour_id);
CREATE INDEX idx_tour_availability_status ON tour_availability(weather_status);

-- ============================================================================
-- TABLE: operator_bookings
-- Purpose: Actual bookings (tourists buying tours)
-- ============================================================================

CREATE TABLE operator_bookings (
  id BIGSERIAL PRIMARY KEY,
  operator_tour_id BIGINT NOT NULL REFERENCES operator_tours(id),

  -- Tourist info (can be anonymous until confirmed)
  tourist_email VARCHAR(255),
  tourist_phone VARCHAR(20),
  tourist_name VARCHAR(255),

  -- Booking details
  booking_date DATE NOT NULL,       -- WHEN is the tour
  participants INT NOT NULL,        -- HOW MANY people
  adult_count INT,
  child_count INT,

  -- Pricing
  base_total_price DECIMAL(10, 2),  -- participants × base_price
  discount_percent INT DEFAULT 0,
  discount_reason VARCHAR(255),     -- 'weather_alternative', 'early_booking'
  final_price DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'RUB',

  -- Payment tracking
  payment_status VARCHAR(20) NOT NULL DEFAULT 'pending',
    -- 'pending', 'paid', 'failed', 'refunded'
  payment_method VARCHAR(50),       -- 'cloudpayments', 'bank_transfer'
  payment_id VARCHAR(255),          -- external payment system ID
  paid_at TIMESTAMP,

  -- Booking status
  booking_status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
    -- 'new', 'confirmed', 'cancelled', 'completed', 'no_show'
  cancellation_reason VARCHAR(255),
  cancelled_at TIMESTAMP,

  -- Weather-related fields
  weather_alert_triggered BOOLEAN DEFAULT false,
  alternative_offered_tour_id BIGINT REFERENCES operator_tours(id),
  customer_chose_alternative BOOLEAN DEFAULT false,
  alternative_booked_date DATE,     -- if chose alternative, when is it

  -- Communication flags
  confirmation_sent BOOLEAN DEFAULT false,
  reminder_sent_24h BOOLEAN DEFAULT false,
  weather_alert_sent BOOLEAN DEFAULT false,

  -- Notes & extensibility
  special_requests TEXT,
  notes TEXT,
  metadata JSONB,

  -- Audit
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_via VARCHAR(50),          -- 'website', 'direct_contact', 'api'

  CONSTRAINT price_valid CHECK (final_price >= 0),
  CONSTRAINT participants_valid CHECK (participants > 0)
);

CREATE INDEX idx_operator_bookings_tour ON operator_bookings(operator_tour_id);
CREATE INDEX idx_operator_bookings_date ON operator_bookings(booking_date);
CREATE INDEX idx_operator_bookings_email ON operator_bookings(tourist_email);
CREATE INDEX idx_operator_bookings_status ON operator_bookings(booking_status);
CREATE INDEX idx_operator_bookings_payment ON operator_bookings(payment_status);

-- ============================================================================
-- TABLE: weather_alerts
-- Purpose: Log of weather alerts & actions taken
-- ============================================================================

CREATE TABLE weather_alerts (
  id BIGSERIAL PRIMARY KEY,

  -- Context
  operator_tour_id BIGINT NOT NULL REFERENCES operator_tours(id),
  location_name VARCHAR(255),
  alert_date DATE NOT NULL,

  -- Weather issue
  alert_type VARCHAR(50),           -- 'wind', 'precipitation', 'visibility'
  severity VARCHAR(20),             -- 'low', 'medium', 'high'
  weather_data JSONB,               -- full weather snapshot

  -- Impact
  affected_bookings INT[],          -- booking IDs affected

  -- Response tracking
  processed BOOLEAN DEFAULT false,
  processed_at TIMESTAMP,
  action_taken VARCHAR(255),        -- 'suggested_alternatives', 'sent_alert'

  created_at TIMESTAMP DEFAULT NOW(),

  CONSTRAINT severity_valid CHECK (severity IN ('low', 'medium', 'high'))
);

CREATE INDEX idx_weather_alerts_date ON weather_alerts(alert_date);
CREATE INDEX idx_weather_alerts_tour ON weather_alerts(operator_tour_id);
CREATE INDEX idx_weather_alerts_processed ON weather_alerts(processed);

-- ============================================================================
-- TABLE: contingency_rules
-- Purpose: Define what to do if tour gets cancelled (offer alternatives)
-- ============================================================================

CREATE TABLE contingency_rules (
  id BIGSERIAL PRIMARY KEY,
  operator_id UUID NOT NULL REFERENCES partners(id),

  -- Primary tour (can be cancelled)
  primary_tour_id BIGINT NOT NULL REFERENCES operator_tours(id),

  -- Alternative tours (offer these if primary cancelled)
  alternative_tour_id BIGINT NOT NULL REFERENCES operator_tours(id),

  -- Rebooking incentives
  discount_percent INT DEFAULT 0,       -- discount if switches
  auto_refund_percent INT DEFAULT 0,    -- refund % if doesn't switch

  -- When to apply
  weather_conditions VARCHAR(255),      -- 'any', 'wind>30', 'precip>5mm'
  available_from DATE,
  available_to DATE,

  -- Priority (order of offering alternatives)
  priority INT DEFAULT 1,               -- 1 = first suggestion

  -- Status
  is_active BOOLEAN DEFAULT true,

  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_contingency_primary ON contingency_rules(primary_tour_id);
CREATE INDEX idx_contingency_priority ON contingency_rules(priority);
CREATE INDEX idx_contingency_active ON contingency_rules(is_active);

-- ============================================================================
-- TRIGGERS: Auto-update updated_at timestamps
-- ============================================================================

CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_operator_tours_timestamp
BEFORE UPDATE ON operator_tours
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_tour_availability_timestamp
BEFORE UPDATE ON tour_availability
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_operator_bookings_timestamp
BEFORE UPDATE ON operator_bookings
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER trigger_contingency_rules_timestamp
BEFORE UPDATE ON contingency_rules
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- ============================================================================
-- VERIFICATION: Ensure migration didn't break existing data
-- ============================================================================

DO $$
BEGIN
  IF (SELECT COUNT(*) FROM partners) = 0 THEN
    RAISE EXCEPTION 'ERROR: partners table is empty!';
  END IF;

  IF (SELECT COUNT(*) FROM users) = 0 THEN
    RAISE EXCEPTION 'ERROR: users table is empty!';
  END IF;

  RAISE NOTICE 'Migration 040 verification: OK (partners: %, users: %)',
    (SELECT COUNT(*) FROM partners),
    (SELECT COUNT(*) FROM users);
END $$;

COMMIT;

-- Migration complete
-- Tables created: operator_tours, tour_availability, operator_bookings, weather_alerts, contingency_rules
-- Indexes created: 17
-- Triggers created: 4
