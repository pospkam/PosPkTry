-- Migration 652: indigenous_info on places
-- Stores information about indigenous peoples and cultural significance.
-- Structure: {
--   peoples: string[],           -- e.g. ["itelmen", "koryak", "even"]
--   local_name: string | null,   -- name in indigenous language
--   sacred: boolean,             -- is a sacred/cultural site
--   traditional_use: string | null, -- description of traditional use
--   respect_notes: string | null    -- specific visitor guidance
-- }

ALTER TABLE places
  ADD COLUMN IF NOT EXISTS indigenous_info JSONB;

COMMENT ON COLUMN places.indigenous_info IS
  'Indigenous peoples cultural info: peoples[], local_name, sacred bool, traditional_use, respect_notes';
