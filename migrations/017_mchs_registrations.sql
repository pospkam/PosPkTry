-- migrations/017_mchs_registrations.sql
-- Регистрация туристических групп в МЧС для операторов

CREATE TABLE IF NOT EXISTS mchs_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  group_composition JSONB NOT NULL DEFAULT '[]'::jsonb,
  route TEXT NOT NULL,
  dates JSONB NOT NULL,
  guide_contacts JSONB NOT NULL,
  emergency_contacts JSONB NOT NULL DEFAULT '[]'::jsonb,
  status VARCHAR(32) NOT NULL DEFAULT 'submitted'
    CHECK (status IN ('submitted', 'registered', 'rejected', 'failed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_mchs_registrations_booking_id
  ON mchs_registrations(booking_id);

CREATE INDEX IF NOT EXISTS idx_mchs_registrations_status_created_at
  ON mchs_registrations(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_mchs_registrations_created_at
  ON mchs_registrations(created_at DESC);
