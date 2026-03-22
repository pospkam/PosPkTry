-- migrations/017_mchs_registrations.sql
-- Регистрация туристических групп в МЧС для операторов
-- Оператор подаёт данные о группе, маршруте и экстренных контактах
-- перед стартом тура. МЧС API интеграция — Phase 2.

CREATE TABLE IF NOT EXISTS mchs_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  operator_id UUID REFERENCES partners(id),
  group_composition JSONB NOT NULL,
  route TEXT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  guide_contacts JSONB NOT NULL,
  emergency_contacts JSONB NOT NULL,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'submitted', 'confirmed', 'rejected')),
  mchs_reference TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mchs_registrations_booking_id
  ON mchs_registrations(booking_id);

CREATE INDEX IF NOT EXISTS idx_mchs_registrations_operator_id
  ON mchs_registrations(operator_id);

CREATE INDEX IF NOT EXISTS idx_mchs_registrations_status
  ON mchs_registrations(status);

CREATE INDEX IF NOT EXISTS idx_mchs_registrations_created_at
  ON mchs_registrations(created_at DESC);
