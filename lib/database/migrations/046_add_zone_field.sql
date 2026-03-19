-- Migration 046: Add zone field to routes for TripPlanner
-- Enable route clustering by geographic regions

ALTER TABLE agent_route_knowledge
ADD COLUMN zone VARCHAR(50);

-- Define zones for Kamchatka:
-- avachinsky: South (Avachinsky, Kozelsky, Petropavlovsk area) — 52.5-54N, 157-159E
-- western: West coast (fishing, rivers) — 54-56N, 156-158E
-- eastern: East (bears, Kronotsky reserve) — 54-55.5N, 159-161E
-- northern: North — 56+N, 150-160E

-- Create index for zone queries
CREATE INDEX idx_agent_route_zone ON agent_route_knowledge(zone);
