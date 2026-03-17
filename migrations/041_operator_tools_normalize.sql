-- Migration 041: Normalize operator tools — junction tables + soft-delete
-- Created: 2026-03-17
-- Reason: Review feedback — replace array columns with proper tables, add soft-delete

BEGIN TRANSACTION;

-- ============================================================================
-- 1. SOFT-DELETE: add deleted_at to all operator tables
-- ============================================================================

ALTER TABLE operator_tours
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;

ALTER TABLE tour_availability
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;

ALTER TABLE operator_bookings
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;

ALTER TABLE contingency_rules
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMP DEFAULT NULL;

CREATE INDEX idx_operator_tours_deleted ON operator_tours(deleted_at) WHERE deleted_at IS NULL;
CREATE INDEX idx_operator_bookings_deleted ON operator_bookings(deleted_at) WHERE deleted_at IS NULL;

-- ============================================================================
-- 2. JUNCTION TABLE: operator_tour_tags (replaces tags VARCHAR(255)[])
-- ============================================================================

CREATE TABLE operator_tour_tags (
  tour_id  BIGINT NOT NULL REFERENCES operator_tours(id) ON DELETE CASCADE,
  tag      VARCHAR(100) NOT NULL,
  PRIMARY KEY (tour_id, tag)
);

CREATE INDEX idx_tour_tags_tag ON operator_tour_tags(tag);

-- Migrate existing tags data (if any rows exist)
INSERT INTO operator_tour_tags (tour_id, tag)
SELECT id, unnest(tags)
FROM operator_tours
WHERE tags IS NOT NULL AND array_length(tags, 1) > 0
ON CONFLICT DO NOTHING;

-- Drop old array column
ALTER TABLE operator_tours DROP COLUMN IF EXISTS tags;

-- ============================================================================
-- 3. JUNCTION TABLE: tour_availability_alternatives
--    (replaces suggested_alternatives BIGINT[])
-- ============================================================================

CREATE TABLE tour_availability_alternatives (
  availability_id BIGINT NOT NULL REFERENCES tour_availability(id) ON DELETE CASCADE,
  alternative_tour_id BIGINT NOT NULL REFERENCES operator_tours(id) ON DELETE CASCADE,
  priority INT DEFAULT 1,
  PRIMARY KEY (availability_id, alternative_tour_id)
);

CREATE INDEX idx_avail_alternatives_tour ON tour_availability_alternatives(alternative_tour_id);

-- Migrate existing data
INSERT INTO tour_availability_alternatives (availability_id, alternative_tour_id, priority)
SELECT id, unnest(suggested_alternatives), row_number() OVER (PARTITION BY id ORDER BY 1)
FROM tour_availability
WHERE suggested_alternatives IS NOT NULL AND array_length(suggested_alternatives, 1) > 0
ON CONFLICT DO NOTHING;

-- Drop old array column
ALTER TABLE tour_availability DROP COLUMN IF EXISTS suggested_alternatives;

-- ============================================================================
-- 4. JUNCTION TABLE: weather_alert_bookings
--    (replaces affected_bookings INT[])
-- ============================================================================

CREATE TABLE weather_alert_bookings (
  alert_id   BIGINT NOT NULL REFERENCES weather_alerts(id) ON DELETE CASCADE,
  booking_id BIGINT NOT NULL REFERENCES operator_bookings(id) ON DELETE CASCADE,
  PRIMARY KEY (alert_id, booking_id)
);

CREATE INDEX idx_alert_bookings_booking ON weather_alert_bookings(booking_id);

-- Migrate existing data
INSERT INTO weather_alert_bookings (alert_id, booking_id)
SELECT id, unnest(affected_bookings)
FROM weather_alerts
WHERE affected_bookings IS NOT NULL AND array_length(affected_bookings, 1) > 0
ON CONFLICT DO NOTHING;

-- Drop old array column
ALTER TABLE weather_alerts DROP COLUMN IF EXISTS affected_bookings;

-- ============================================================================
-- 5. VERIFICATION
-- ============================================================================

DO $$
DECLARE
  tours_count INT;
  avail_count INT;
BEGIN
  SELECT COUNT(*) INTO tours_count FROM operator_tours;
  SELECT COUNT(*) INTO avail_count FROM tour_availability;

  RAISE NOTICE 'Migration 041 complete: operator_tours=%, tour_availability=%',
    tours_count, avail_count;

  -- Verify junction tables exist
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'operator_tour_tags') THEN
    RAISE EXCEPTION 'operator_tour_tags table missing!';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tour_availability_alternatives') THEN
    RAISE EXCEPTION 'tour_availability_alternatives table missing!';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'weather_alert_bookings') THEN
    RAISE EXCEPTION 'weather_alert_bookings table missing!';
  END IF;

  -- Verify deleted_at columns
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'operator_tours' AND column_name = 'deleted_at') THEN
    RAISE EXCEPTION 'deleted_at missing on operator_tours!';
  END IF;

  RAISE NOTICE 'Migration 041 verification: OK';
END $$;

COMMIT;

-- Migration complete
-- Changes: soft-delete on 4 tables, 3 junction tables replacing arrays
-- Indexes added: 6
