-- Migration 064: Normalize zone names in user_trips.days JSONB
-- Convert elizovsky/milkovsky/karaginsky/tigil -> avachinsky/western/eastern/northern
-- This aligns saved trip data with the canonical zone IDs used in agent_route_knowledge

UPDATE user_trips
SET days = (
  SELECT jsonb_agg(
    CASE
      WHEN elem->>'zone' = 'elizovsky'  THEN jsonb_set(elem, '{zone}', '"avachinsky"')
      WHEN elem->>'zone' = 'milkovsky'  THEN jsonb_set(elem, '{zone}', '"western"')
      WHEN elem->>'zone' = 'karaginsky' THEN jsonb_set(elem, '{zone}', '"eastern"')
      WHEN elem->>'zone' = 'tigil'      THEN jsonb_set(elem, '{zone}', '"northern"')
      ELSE elem
    END
  ) FROM jsonb_array_elements(days) AS elem
)
WHERE days IS NOT NULL
  AND days != '[]'::jsonb
  AND (
    days::text LIKE '%elizovsky%'
    OR days::text LIKE '%milkovsky%'
    OR days::text LIKE '%karaginsky%'
    OR days::text LIKE '%tigil%'
  );
