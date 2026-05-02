-- Migration 158: content fields for place card (Blocks 3, 6, 7 of new spec)
-- Adds essence, access_info, best_season, seasonal_notes to places.
-- Adds required_gear, connectivity, registration_required, medical_info to location_safety_profile.

ALTER TABLE places
  ADD COLUMN IF NOT EXISTS essence          TEXT,
  ADD COLUMN IF NOT EXISTS photo_url        TEXT,
  ADD COLUMN IF NOT EXISTS best_season      TEXT,
  ADD COLUMN IF NOT EXISTS seasonal_notes   JSONB,
  ADD COLUMN IF NOT EXISTS access_info      TEXT;

ALTER TABLE location_safety_profile
  ADD COLUMN IF NOT EXISTS required_gear          TEXT[],
  ADD COLUMN IF NOT EXISTS connectivity           JSONB,
  ADD COLUMN IF NOT EXISTS registration_required  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS medical_info           TEXT;
