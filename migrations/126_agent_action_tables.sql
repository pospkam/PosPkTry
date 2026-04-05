-- Migration 126: Agent Action Tables
-- Tables for Security Block and Eco Zone Capacity executors

-- Security blocks (IP and user blocking by Security Agent)
CREATE TABLE IF NOT EXISTS security_blocks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ip TEXT UNIQUE,
  user_id UUID REFERENCES users(id),
  reason TEXT NOT NULL,
  blocked_by TEXT NOT NULL DEFAULT 'manual',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT security_blocks_target CHECK (ip IS NOT NULL OR user_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_security_blocks_ip ON security_blocks(ip) WHERE ip IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_security_blocks_expires ON security_blocks(expires_at) WHERE expires_at IS NOT NULL;

-- Zone capacity limits (Eco Agent)
CREATE TABLE IF NOT EXISTS zone_capacity_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  zone TEXT UNIQUE NOT NULL,
  max_daily_visitors INT NOT NULL CHECK (max_daily_visitors > 0),
  reason TEXT,
  set_by TEXT NOT NULL DEFAULT 'manual',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_zone_capacity_zone ON zone_capacity_limits(zone);

-- Add is_blocked and blocked_reason to users if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_blocked') THEN
    ALTER TABLE users ADD COLUMN is_blocked BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'blocked_reason') THEN
    ALTER TABLE users ADD COLUMN blocked_reason TEXT;
  END IF;
END $$;

-- Add admin_notes to operator_bookings if not exists
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'operator_bookings' AND column_name = 'admin_notes') THEN
    ALTER TABLE operator_bookings ADD COLUMN admin_notes TEXT;
  END IF;
END $$;
