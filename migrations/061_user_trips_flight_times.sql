-- Migration 061: Add flight times + airport transfer flag to user_trips
-- Enables time-aware Day 1 / last day generation and operator greeting logistics

BEGIN;

ALTER TABLE user_trips
  ADD COLUMN IF NOT EXISTS flight_arrival_time    VARCHAR(5)  DEFAULT NULL,  -- "14:30" (HH:MM)
  ADD COLUMN IF NOT EXISTS flight_departure_time  VARCHAR(5)  DEFAULT NULL,  -- "09:15" (HH:MM)
  ADD COLUMN IF NOT EXISTS needs_airport_transfer BOOLEAN     NOT NULL DEFAULT FALSE;

COMMIT;
