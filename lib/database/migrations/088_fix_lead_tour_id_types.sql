-- Migration 088: Fix lead tour ID type mismatch
-- operator_tours.id is BIGINT, but matched_tour_ids/primary_tour_id were UUID[]
-- Error: "invalid input syntax for type uuid: 7"

ALTER TABLE lead_proposals DROP CONSTRAINT IF EXISTS lead_proposals_primary_tour_id_fkey;

ALTER TABLE leads
  ALTER COLUMN matched_tour_ids TYPE TEXT[]
  USING matched_tour_ids::TEXT[];

ALTER TABLE lead_proposals
  ALTER COLUMN primary_tour_id TYPE TEXT
  USING primary_tour_id::TEXT;

ALTER TABLE lead_proposals
  ALTER COLUMN alt_tour_ids TYPE TEXT[]
  USING alt_tour_ids::TEXT[];
