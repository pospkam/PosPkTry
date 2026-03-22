-- Migration: Fix bookings table schema inconsistencies
-- Date: 2025-11-10
-- Purpose: Add missing fields used by frontend

-- Step 1: Add start_date column (used in operator dashboard)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS start_date DATE;

-- Step 2: Add guests_count column (frontend uses this name)
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS guests_count INTEGER;

-- Step 3: Migrate data from existing columns
UPDATE bookings 
SET start_date = date 
WHERE start_date IS NULL AND date IS NOT NULL;

UPDATE bookings 
SET guests_count = participants 
WHERE guests_count IS NULL AND participants IS NOT NULL;

-- Step 4: Add default values
ALTER TABLE bookings ALTER COLUMN start_date SET DEFAULT CURRENT_DATE;
ALTER TABLE bookings ALTER COLUMN guests_count SET DEFAULT 1;

-- Step 5: Create indexes for queries
CREATE INDEX IF NOT EXISTS idx_bookings_start_date ON bookings(start_date);

-- Step 6: Add check constraint
ALTER TABLE bookings ADD CONSTRAINT chk_guests_count_positive 
  CHECK (guests_count > 0);

COMMENT ON COLUMN bookings.start_date IS 'Tour start date (frontend field)';
COMMENT ON COLUMN bookings.guests_count IS 'Number of guests (frontend field, same as participants)';
