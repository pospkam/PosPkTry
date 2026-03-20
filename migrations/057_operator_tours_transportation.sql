-- Migration 057: Add transportation JSONB column to operator_tours
-- Date: 2026-03-20
--
-- Format: [{"type":"walking"|"jeep"|"helicopter"|"boat","price_add":5000,"duration_hours":6}]
-- Each element describes one available transport option for this tour.
-- price_add — surcharge on top of base_price per person
-- duration_hours — how long the transport leg takes
--
-- IDEMPOTENT: safe to run multiple times (IF NOT EXISTS)

BEGIN;

ALTER TABLE operator_tours
  ADD COLUMN IF NOT EXISTS transportation JSONB DEFAULT '[]';

COMMENT ON COLUMN operator_tours.transportation
  IS 'Available transport options: [{type: walking|jeep|helicopter|boat, price_add: number, duration_hours: number}]';

COMMIT;
