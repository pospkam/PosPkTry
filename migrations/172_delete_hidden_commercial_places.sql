-- Migration 172: Permanently delete all hidden places (commercial tour listings)
-- These are tour-product entries scraped from operator sites — not geographic places.
-- All real geographic places were made visible in migration 171 (599 visible now).
-- Cascade: safety profiles, realtime records, AI images for these places.

-- Collect hidden place IDs into temp table for cascaded cleanup
CREATE TEMP TABLE _hidden_place_ids AS
SELECT id, ark_id FROM places WHERE is_visible = false;

-- 1. Remove safety profiles
DELETE FROM location_safety_profile
WHERE agent_route_id IN (SELECT ark_id FROM _hidden_place_ids);

-- 2. Remove realtime records
DELETE FROM location_real_time_status
WHERE agent_route_id IN (SELECT ark_id FROM _hidden_place_ids);

-- 3. Remove AI images
DELETE FROM ai_route_images
WHERE route_id IN (SELECT ark_id FROM _hidden_place_ids);

-- 4. Delete the places themselves
DELETE FROM places WHERE is_visible = false;

DROP TABLE _hidden_place_ids;

INSERT INTO _migrations (name)
VALUES ('172_delete_hidden_commercial_places.sql')
ON CONFLICT (name) DO NOTHING;
