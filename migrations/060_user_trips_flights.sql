-- Migration 060: Add flight numbers to user_trips
-- Arrival/departure flights for operator greeting + airport logistics

BEGIN;

ALTER TABLE user_trips
  ADD COLUMN IF NOT EXISTS flight_arrival   VARCHAR(20),   -- e.g. "SU 1234"
  ADD COLUMN IF NOT EXISTS flight_departure VARCHAR(20);  -- e.g. "S7 456"

COMMIT;
