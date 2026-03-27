-- Migration 050: add identity fields to sos_events
-- Необходимо знать КТО отправил SOS (имя, телефон), а не только координаты и IP

ALTER TABLE sos_events
  ADD COLUMN IF NOT EXISTS tourist_name    TEXT,
  ADD COLUMN IF NOT EXISTS tourist_phone   TEXT,
  ADD COLUMN IF NOT EXISTS message         TEXT,
  ADD COLUMN IF NOT EXISTS emergency_type  TEXT;
