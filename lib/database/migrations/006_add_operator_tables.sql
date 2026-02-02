-- Migration: Add operator-specific tables
-- Date: 2025-11-10
-- Purpose: Calendar, availability, and communication tables

-- Step 1: Tour availability calendar
CREATE TABLE IF NOT EXISTS tour_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  tour_id UUID NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  available_spots INTEGER NOT NULL DEFAULT 0,
  is_blocked BOOLEAN DEFAULT FALSE,
  block_reason TEXT,
  price_override DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tour_id, date)
);

CREATE INDEX IF NOT EXISTS idx_tour_availability_tour_id ON tour_availability(tour_id);
CREATE INDEX IF NOT EXISTS idx_tour_availability_date ON tour_availability(date);
CREATE INDEX IF NOT EXISTS idx_tour_availability_blocked ON tour_availability(is_blocked);

-- Step 2: Operator settings
CREATE TABLE IF NOT EXISTS operator_settings (
  user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  auto_confirm_bookings BOOLEAN DEFAULT FALSE,
  booking_lead_time INTEGER DEFAULT 24,
  cancellation_policy TEXT,
  refund_policy TEXT,
  min_group_size INTEGER DEFAULT 1,
  max_advance_booking_days INTEGER DEFAULT 365,
  timezone VARCHAR(50) DEFAULT 'Asia/Kamchatka',
  currency VARCHAR(3) DEFAULT 'RUB',
  commission_rate DECIMAL(5,2) DEFAULT 10.00,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Step 3: Client communications
CREATE TABLE IF NOT EXISTS client_communications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  recipient_id UUID NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  is_system_message BOOLEAN DEFAULT FALSE,
  attachments JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_client_comms_booking_id ON client_communications(booking_id);
CREATE INDEX IF NOT EXISTS idx_client_comms_sender_id ON client_communications(sender_id);
CREATE INDEX IF NOT EXISTS idx_client_comms_recipient_id ON client_communications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_client_comms_created_at ON client_communications(created_at DESC);

-- Step 4: Message templates
CREATE TABLE IF NOT EXISTS message_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  subject VARCHAR(255),
  content TEXT NOT NULL,
  template_type VARCHAR(50),
  variables JSONB DEFAULT '[]',
  is_active BOOLEAN DEFAULT TRUE,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_message_templates_user_id ON message_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_message_templates_type ON message_templates(template_type);

-- Step 5: Operator statistics cache (for performance)
CREATE TABLE IF NOT EXISTS operator_stats_cache (
  operator_id UUID PRIMARY KEY REFERENCES partners(id) ON DELETE CASCADE,
  total_tours INTEGER DEFAULT 0,
  active_tours INTEGER DEFAULT 0,
  total_bookings INTEGER DEFAULT 0,
  total_revenue DECIMAL(12,2) DEFAULT 0,
  avg_rating DECIMAL(3,2) DEFAULT 0,
  total_reviews INTEGER DEFAULT 0,
  completion_rate DECIMAL(5,2) DEFAULT 0,
  last_calculated TIMESTAMPTZ DEFAULT NOW()
);

-- Step 6: Auto-update triggers
CREATE TRIGGER update_tour_availability_updated_at 
  BEFORE UPDATE ON tour_availability
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_operator_settings_updated_at 
  BEFORE UPDATE ON operator_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_message_templates_updated_at 
  BEFORE UPDATE ON message_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 7: Initialize default settings for existing operators
INSERT INTO operator_settings (user_id)
SELECT u.id 
FROM users u
WHERE u.role = 'operator'
  AND NOT EXISTS (
    SELECT 1 FROM operator_settings os WHERE os.user_id = u.id
  );

COMMENT ON TABLE tour_availability IS 'Daily availability and pricing for tours';
COMMENT ON TABLE operator_settings IS 'Operator-specific settings and preferences';
COMMENT ON TABLE client_communications IS 'Direct messages between operators and clients';
COMMENT ON TABLE message_templates IS 'Reusable message templates for operators';
COMMENT ON TABLE operator_stats_cache IS 'Cached statistics for performance';
