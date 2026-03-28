-- Migration 110: Fix 'esoteric' activity_type values
-- These entries had incorrect activity_type set by AI scraper.
-- Map them to meaningful values based on their category.

UPDATE agent_route_knowledge
SET activity_type = CASE category
  WHEN 'vulkani'              THEN 'trekking'
  WHEN 'geyzery'              THEN 'trekking'
  WHEN 'termalnye_istochniki' THEN 'thermal'
  WHEN 'morskie_progulki'     THEN 'boat_trip'
  WHEN 'medvedi'              THEN 'bear_watching'
  WHEN 'mountains'            THEN 'trekking'
  WHEN 'nature_park'          THEN 'eco'
  ELSE 'eco'
END
WHERE activity_type = 'esoteric'
  AND is_visible = TRUE;
