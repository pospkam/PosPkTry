-- migrations/018_booking_transfers.sql
-- Переброс бронирований между операторами.
-- Оператор А предлагает передать бронирование оператору Б с комиссией.
-- Оператор Б принимает или отклоняет.

CREATE TABLE IF NOT EXISTS booking_transfers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID REFERENCES bookings(id),
  from_operator_id UUID REFERENCES partners(id),
  to_operator_id UUID REFERENCES partners(id),
  commission_percent DECIMAL(5,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'pending'
    CHECK (status IN ('pending', 'accepted', 'rejected', 'completed')),
  message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_transfers_from
  ON booking_transfers(from_operator_id, status);

CREATE INDEX IF NOT EXISTS idx_booking_transfers_to
  ON booking_transfers(to_operator_id, status);

CREATE INDEX IF NOT EXISTS idx_booking_transfers_booking
  ON booking_transfers(booking_id);
