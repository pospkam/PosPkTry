-- Migration 044: Remove duplicate fishingkam route
-- Date: 2026-03-19
-- Reason: f25ed309 is a seed-record with no offers/photos.
--         The real record is 92c9ded2 (4 photos, 11 tours).

DELETE FROM agent_route_knowledge
WHERE id = 'f25ed309-0a7e-4f70-bec1-82afaef7f1d5';
