-- migrations/650_cleanup_places_phase1.sql
--
-- Phase 1: clean up agent_route_knowledge rows where kind='place'.
-- Idempotent: safe to run multiple times.
--
-- Rules enforced:
--   • place.activity_type IS NULL        (places have no activity)
--   • place.location_type IS NOT NULL    (every place must be typed)
--   • place.lat/lng IS NOT NULL          (every place must be mappable)
--     rows missing coords → is_visible=FALSE until geocoded

BEGIN;

-- 1. Strip activity_type from all places (1072 rows expected)
UPDATE agent_route_knowledge
   SET activity_type = NULL,
       updated_at = NOW()
 WHERE kind = 'place' AND activity_type IS NOT NULL;

-- 2. Infer location_type for places where it's missing, from title keywords
UPDATE agent_route_knowledge
   SET location_type = CASE
     WHEN title ILIKE '%vodopad%' OR title ILIKE '%водопад%' THEN 'waterfall'
     WHEN title ILIKE '%vulkan%'  OR title ILIKE '%вулкан%'  THEN 'volcano'
     WHEN title ILIKE '%bukhta%'  OR title ILIKE '%бухт%'    THEN 'bay'
     WHEN title ILIKE '%ozero%'   OR title ILIKE '%озер%'    THEN 'lake'
     WHEN title ILIKE '%reka%'    OR title ILIKE '%река%'    THEN 'river'
     WHEN title ILIKE '%gora%'    OR title ILIKE '%gornyy%'  OR title ILIKE '%гор%' THEN 'mountain'
     WHEN title ILIKE '%mys%'     OR title ILIKE '%мыс%'     THEN 'cape'
     WHEN title ILIKE '%istochnik%' OR title ILIKE '%источник%' THEN 'hot_spring'
     WHEN title ILIKE '%geyser%'  OR title ILIKE '%гейзер%'  THEN 'geyser'
     WHEN title ILIKE '%mayak%'   OR title ILIKE '%маяк%'    THEN 'historical'
     WHEN title ILIKE '%muzey%'   OR title ILIKE '%музей%'   THEN 'museum'
     WHEN title ILIKE '%skala%'   OR title ILIKE '%скал%'    THEN 'rock'
     WHEN title ILIKE '%ostrov%'  OR title ILIKE '%остров%'  THEN 'island'
     WHEN title ILIKE '%lednik%'  OR title ILIKE '%ледник%'  THEN 'glacier'
     WHEN title ILIKE '%plyazh%'  OR title ILIKE '%пляж%'    THEN 'beach'
     WHEN title ILIKE '%les%'     OR title ILIKE '%лес%'     THEN 'forest'
     ELSE 'other'
   END,
   updated_at = NOW()
 WHERE kind = 'place' AND location_type IS NULL;

-- 3. Hide places without coordinates from public listings
UPDATE agent_route_knowledge
   SET is_visible = FALSE,
       updated_at = NOW()
 WHERE kind = 'place'
   AND (lat IS NULL OR lng IS NULL)
   AND is_visible IS DISTINCT FROM FALSE;

-- 4. Soft CHECK constraint: enforce rules for NEW rows only (NOT VALID)
ALTER TABLE agent_route_knowledge
  DROP CONSTRAINT IF EXISTS ark_place_shape;

ALTER TABLE agent_route_knowledge
  ADD CONSTRAINT ark_place_shape
  CHECK (
    kind <> 'place'
    OR (activity_type IS NULL AND location_type IS NOT NULL)
  ) NOT VALID;

COMMIT;

-- Verification query (run manually to confirm):
--   SELECT
--     COUNT(*) FILTER (WHERE kind='place' AND activity_type IS NOT NULL) AS bad_activity,
--     COUNT(*) FILTER (WHERE kind='place' AND location_type IS NULL)     AS bad_loctype,
--     COUNT(*) FILTER (WHERE kind='place' AND (lat IS NULL OR lng IS NULL) AND is_visible=TRUE) AS hidden_missing_coords
--   FROM agent_route_knowledge;
