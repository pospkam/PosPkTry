-- Migration: Add Guide-specific fields to partners table
-- Date: 2025-11-10
-- Purpose: Extend partners table with guide professional characteristics

-- ============================================
-- ADD GUIDE FIELDS TO PARTNERS TABLE
-- ============================================

-- Experience years (1-50 years)
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS experience_years INTEGER 
CHECK (experience_years IS NULL OR (experience_years BETWEEN 1 AND 50));

-- Languages spoken by guide (array, default Russian)
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS languages TEXT[] DEFAULT ARRAY['russian'];

-- Specializations (validated array)
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS specializations TEXT[] 
CHECK (
  specializations IS NULL OR 
  specializations <@ ARRAY['volcanoes', 'wildlife', 'fishing', 'history', 'photography', 'extreme', 'hiking', 'cultural', 'rafting', 'skiing']
);

-- Biography/About text
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS bio TEXT;

-- Guide's base location (PostGIS geography point)
-- Coordinates for displaying on map
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT);

-- Total earnings from tours (10% commission)
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS total_earnings DECIMAL(12,2) DEFAULT 0.0;

-- Availability status
ALTER TABLE partners 
ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;

-- ============================================
-- CREATE INDEXES
-- ============================================

-- Index for location-based queries
CREATE INDEX IF NOT EXISTS idx_partners_location 
ON partners USING GIST (location)
WHERE category = 'guide';

-- Index for guide specializations
CREATE INDEX IF NOT EXISTS idx_partners_specializations 
ON partners USING GIN (specializations)
WHERE category = 'guide';

-- Index for guide languages
CREATE INDEX IF NOT EXISTS idx_partners_languages 
ON partners USING GIN (languages)
WHERE category = 'guide';

-- Index for available guides
CREATE INDEX IF NOT EXISTS idx_partners_available 
ON partners (is_available)
WHERE category = 'guide';

-- ============================================
-- COMMENTS
-- ============================================

COMMENT ON COLUMN partners.experience_years IS 'Years of professional guiding experience (1-50)';
COMMENT ON COLUMN partners.languages IS 'Languages spoken by guide (ISO codes or names)';
COMMENT ON COLUMN partners.specializations IS 'Guide expertise areas: volcanoes, wildlife, fishing, etc.';
COMMENT ON COLUMN partners.bio IS 'Guide biography and about section';
COMMENT ON COLUMN partners.location IS 'Guide base location (PostGIS geography point)';
COMMENT ON COLUMN partners.total_earnings IS 'Cumulative earnings from tours (10% commission)';
COMMENT ON COLUMN partners.is_available IS 'Current availability status for new bookings';
