-- Migration 162: Add place_id to reviews for place-specific reviews
-- Per CLAUDE.md section 9: reviews are attached to the PLACE, not the tour.

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS place_id UUID REFERENCES places(ark_id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_reviews_place_id ON reviews (place_id)
  WHERE place_id IS NOT NULL;

INSERT INTO _migrations (name)
VALUES ('162_reviews_place_id.sql')
ON CONFLICT (name) DO NOTHING;
