-- 017_create_mchs_and_transfer_booking.sql
-- Модуль регистрации групп в МЧС + переброс бронирований между операторами

CREATE TABLE IF NOT EXISTS mchs_group_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  operator_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  group_name VARCHAR(255) NOT NULL,
  group_members JSONB NOT NULL DEFAULT '[]'::jsonb,
  route_description TEXT NOT NULL,
  route_region VARCHAR(255),
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  guide_contact JSONB NOT NULL,
  emergency_contacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  participant_count INTEGER NOT NULL CHECK (participant_count BETWEEN 1 AND 100),
  status VARCHAR(32) NOT NULL CHECK (status IN ('submitted', 'registered', 'rejected', 'failed')) DEFAULT 'submitted',
  mchs_request_id VARCHAR(255),
  mchs_response JSONB,
  last_error TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mchs_registrations_operator_user
  ON mchs_group_registrations(operator_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_mchs_registrations_status
  ON mchs_group_registrations(status, created_at DESC);

CREATE TABLE IF NOT EXISTS operator_booking_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  from_operator_partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  to_operator_partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  from_operator_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_operator_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  commission_percent NUMERIC(5,2) NOT NULL CHECK (commission_percent >= 0 AND commission_percent <= 100),
  commission_amount NUMERIC(12,2) NOT NULL CHECK (commission_amount >= 0),
  status VARCHAR(32) NOT NULL CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')) DEFAULT 'pending',
  note TEXT,
  target_tour_id UUID REFERENCES tours(id) ON DELETE SET NULL,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_operator_transfer_incoming
  ON operator_booking_transfers(to_operator_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operator_transfer_outgoing
  ON operator_booking_transfers(from_operator_user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_operator_transfer_booking
  ON operator_booking_transfers(booking_id, created_at DESC);
