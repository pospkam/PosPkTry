-- Migration 050: OCTO API tables
-- OCTO (Open Connectivity for Tours & Activities) — standard supplier-side API
-- Compatible with: Amadeus, Tiqets, Musement (TUI), Headout, Go City, Groupon, Peek, Xola

BEGIN;

-- 1. API keys for resellers (OTA channels)
CREATE TABLE IF NOT EXISTS octo_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  api_key VARCHAR(128) NOT NULL UNIQUE,
  operator_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  can_read_products BOOLEAN DEFAULT true,
  can_read_availability BOOLEAN DEFAULT true,
  can_create_bookings BOOLEAN DEFAULT true,
  rate_limit_per_minute INT DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  last_used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES users(id),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_octo_api_keys_key ON octo_api_keys(api_key) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_octo_api_keys_operator ON octo_api_keys(operator_id);

-- 2. Tour options (OCTO Option: Standard, VIP, etc.)
CREATE TABLE IF NOT EXISTS tour_options (
  id BIGSERIAL PRIMARY KEY,
  operator_tour_id BIGINT NOT NULL REFERENCES operator_tours(id) ON DELETE CASCADE,
  internal_name VARCHAR(255) NOT NULL,
  is_default BOOLEAN DEFAULT false,
  price_adult DECIMAL(10,2),
  price_child DECIMAL(10,2),
  price_youth DECIMAL(10,2),
  max_units INT,
  min_units INT DEFAULT 1,
  restrictions JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tour_options_tour ON tour_options(operator_tour_id);

-- 3. OCTO columns on operator_bookings
ALTER TABLE operator_bookings
  ADD COLUMN IF NOT EXISTS octo_uuid UUID DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS octo_api_key_id UUID REFERENCES octo_api_keys(id),
  ADD COLUMN IF NOT EXISTS hold_expires_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS option_id BIGINT REFERENCES tour_options(id),
  ADD COLUMN IF NOT EXISTS availability_id VARCHAR(128);

CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_octo_uuid
  ON operator_bookings(octo_uuid) WHERE octo_uuid IS NOT NULL;

-- Idempotency: one booking per availabilityId per OCTO key
CREATE UNIQUE INDEX IF NOT EXISTS idx_bookings_availability_idempotent
  ON operator_bookings(availability_id, octo_api_key_id)
  WHERE availability_id IS NOT NULL AND octo_api_key_id IS NOT NULL AND deleted_at IS NULL;

-- 4. OCTO booking audit log
CREATE TABLE IF NOT EXISTS octo_booking_log (
  id BIGSERIAL PRIMARY KEY,
  booking_id BIGINT NOT NULL REFERENCES operator_bookings(id),
  action VARCHAR(50) NOT NULL,
  api_key_id UUID REFERENCES octo_api_keys(id),
  request_body JSONB,
  response_body JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_octo_booking_log_booking ON octo_booking_log(booking_id);

-- 5. Auto-create "Standard" option for all existing tours
INSERT INTO tour_options (operator_tour_id, internal_name, is_default)
SELECT id, 'Standard', true
FROM operator_tours
WHERE deleted_at IS NULL
  AND id NOT IN (SELECT operator_tour_id FROM tour_options);

COMMIT;
