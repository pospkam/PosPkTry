-- Migration 165: Add author_name to reviews for anonymous place reviews
-- Place reviews don't require auth — visitor leaves name voluntarily.

ALTER TABLE reviews
  ADD COLUMN IF NOT EXISTS author_name VARCHAR(100);

INSERT INTO _migrations (name)
VALUES ('165_reviews_author_name.sql')
ON CONFLICT (name) DO NOTHING;
