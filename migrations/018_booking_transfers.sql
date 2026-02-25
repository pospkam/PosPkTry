-- migrations/018_booking_transfers.sql
-- Переброс бронирований между операторами

CREATE TABLE IF NOT EXISTS operator_booking_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  from_operator_partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  to_operator_partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  from_operator_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  to_operator_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  commission_percent NUMERIC(5,2) NOT NULL CHECK (commission_percent >= 0 AND commission_percent <= 100),
  commission_amount NUMERIC(12,2) NOT NULL CHECK (commission_amount >= 0),
  status VARCHAR(32) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')),
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

-- В каждый момент времени может быть только один активный (pending) оффер по бронированию.
CREATE UNIQUE INDEX IF NOT EXISTS uq_operator_transfer_booking_pending
  ON operator_booking_transfers(booking_id)
  WHERE status = 'pending';
