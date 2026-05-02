-- migrations/650_cleanup_places_phase1.sql
--
-- Phase 1: clean up places table (was written for agent_route_knowledge view — fixed).
-- Idempotent: safe to run multiple times.
--
-- Rules enforced:
--   • place.activity_type IS NULL        (places have no activity)
--   • place.location_type IS NOT NULL    (every place must be typed)
--   • place.lat/lng ARE NOT NULL in schema, so coord check is informational only

BEGIN;

-- 1. Strip activity_type from all places
UPDATE places
   SET activity_type = NULL,
       updated_at = NOW()
 WHERE activity_type IS NOT NULL;

-- 2. Infer location_type for places where it's missing, from name keywords
UPDATE places
   SET location_type = CASE
     WHEN name ILIKE '%vodopad%'    OR name ILIKE '%водопад%'    THEN 'waterfall'
     WHEN name ILIKE '%vulkan%'     OR name ILIKE '%вулкан%'     THEN 'volcano'
     WHEN name ILIKE '%bukhta%'     OR name ILIKE '%бухт%'       THEN 'bay'
     WHEN name ILIKE '%ozero%'      OR name ILIKE '%озер%'       THEN 'lake'
     WHEN name ILIKE '%reka%'       OR name ILIKE '%река%'       THEN 'river'
     WHEN name ILIKE '%gora%'       OR name ILIKE '%gornyy%'
                                    OR name ILIKE '%гор%'        THEN 'mountain'
     WHEN name ILIKE '%mys%'        OR name ILIKE '%мыс%'        THEN 'cape'
     WHEN name ILIKE '%istochnik%'  OR name ILIKE '%источник%'   THEN 'hot_spring'
     WHEN name ILIKE '%geyser%'     OR name ILIKE '%гейзер%'     THEN 'geyser'
     WHEN name ILIKE '%mayak%'      OR name ILIKE '%маяк%'       THEN 'historical'
     WHEN name ILIKE '%muzey%'      OR name ILIKE '%музей%'      THEN 'museum'
     WHEN name ILIKE '%skala%'      OR name ILIKE '%скал%'       THEN 'rock'
     WHEN name ILIKE '%ostrov%'     OR name ILIKE '%остров%'     THEN 'island'
     WHEN name ILIKE '%lednik%'     OR name ILIKE '%ледник%'     THEN 'glacier'
     WHEN name ILIKE '%plyazh%'     OR name ILIKE '%пляж%'       THEN 'beach'
     WHEN name ILIKE '%les%'        OR name ILIKE '%лес%'        THEN 'forest'
     ELSE 'other'
   END,
   updated_at = NOW()
 WHERE location_type IS NULL;

-- 3. Soft CHECK constraint on places (not on the VIEW)
ALTER TABLE places
  DROP CONSTRAINT IF EXISTS places_shape_check;

ALTER TABLE places
  ADD CONSTRAINT places_shape_check
  CHECK (activity_type IS NULL AND location_type IS NOT NULL)
  NOT VALID;

COMMIT;
