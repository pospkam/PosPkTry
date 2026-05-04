-- Migration 168: Build synthetic LineString geometry for routes from waypoints
--
-- For each kamchatka_route that has no geometry yet but has 2+ places in
-- route_waypoints, constructs a GeoJSON LineString:
--   [route.lat/lng] → places sorted by distance from route center
--
-- This gives a rough visual track on the map. Real OSM tracks are stored
-- by scripts/import-osm-geometry.ts and will always override these.

UPDATE kamchatka_routes kr
SET geometry = sub.geom
FROM (
  SELECT
    kr2.id AS route_id,
    jsonb_build_object(
      'type', 'LineString',
      'coordinates',
      -- Start at the route's own lat/lng, then through waypoints by proximity
      jsonb_build_array(kr2.lng::float, kr2.lat::float) ||
      jsonb_agg(
        jsonb_build_array(p.lng::float, p.lat::float)
        ORDER BY rw.position
      )
    ) AS geom
  FROM route_waypoints rw
  JOIN places p ON p.id = rw.place_id
  JOIN kamchatka_routes kr2 ON kr2.id = rw.route_id
  WHERE kr2.lat IS NOT NULL
    AND kr2.lng IS NOT NULL
    AND kr2.geometry IS NULL
    AND kr2.is_visible = true
    AND p.lat IS NOT NULL
    AND p.lng IS NOT NULL
  GROUP BY kr2.id, kr2.lat, kr2.lng
  HAVING COUNT(*) >= 1
) sub
WHERE kr.id = sub.route_id
  AND kr.geometry IS NULL;

INSERT INTO _migrations (name)
VALUES ('168_geometry_from_waypoints.sql')
ON CONFLICT (name) DO NOTHING;
