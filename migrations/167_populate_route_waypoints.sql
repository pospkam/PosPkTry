-- Migration 167: Populate route_waypoints via geographic proximity
-- Links kamchatka_routes to nearby places (within 15km) so that
-- place cards show related routes and route cards show waypoints.
-- Idempotent: ON CONFLICT DO NOTHING.

BEGIN;

-- Create table if it was never migrated (safety net)
CREATE TABLE IF NOT EXISTS route_waypoints (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  route_id  UUID NOT NULL,
  place_id  UUID NOT NULL,
  position  INT  NOT NULL DEFAULT 0,
  is_start  BOOLEAN NOT NULL DEFAULT false,
  is_end    BOOLEAN NOT NULL DEFAULT false,
  notes     TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(route_id, place_id)
);

INSERT INTO route_waypoints (route_id, place_id, position, is_start)
SELECT
  r.id                         AS route_id,
  p.id                         AS place_id,
  ROW_NUMBER() OVER (
    PARTITION BY r.id
    ORDER BY
      (r.lat::float - p.lat::float)^2 + (r.lng::float - p.lng::float)^2
  )::int                       AS position,
  ROW_NUMBER() OVER (
    PARTITION BY r.id
    ORDER BY
      (r.lat::float - p.lat::float)^2 + (r.lng::float - p.lng::float)^2
  ) = 1                        AS is_start
FROM kamchatka_routes r
JOIN places p ON
  p.is_visible = true
  AND p.lat BETWEEN (r.lat::float - 0.135) AND (r.lat::float + 0.135)
  AND p.lng BETWEEN (r.lng::float - 0.18)  AND (r.lng::float + 0.18)
  AND (6371 * acos(
    LEAST(1.0,
      cos(radians(r.lat::float)) * cos(radians(p.lat::float)) *
      cos(radians(p.lng::float) - radians(r.lng::float)) +
      sin(radians(r.lat::float)) * sin(radians(p.lat::float))
    )
  )) <= 15
WHERE r.is_visible = true
  AND r.lat IS NOT NULL
  AND r.lng IS NOT NULL
ON CONFLICT (route_id, place_id) DO NOTHING;

COMMIT;

INSERT INTO _migrations (name)
VALUES ('167_populate_route_waypoints.sql')
ON CONFLICT (name) DO NOTHING;
