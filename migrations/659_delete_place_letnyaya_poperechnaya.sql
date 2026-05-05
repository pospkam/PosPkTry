-- Migration 659: delete place "Гора Летняя Поперечная" (bad coordinates, no GPS reference)
-- id: d03edfd2-47ce-4fea-b573-abc22e9ddd83
-- Stored coords (53.07, 150.65) are outside Kamchatka bbox (lng 150.65 < 155).
-- 1 route_waypoint, 1 location_safety_profile, 1 ai_route_image — all cascade-deleted first.

DELETE FROM route_waypoints
WHERE place_id::text = 'd03edfd2-47ce-4fea-b573-abc22e9ddd83';

DELETE FROM location_safety_profile
WHERE agent_route_id = (SELECT ark_id FROM places WHERE id = 'd03edfd2-47ce-4fea-b573-abc22e9ddd83');

DELETE FROM ai_route_images
WHERE route_id = (SELECT ark_id FROM places WHERE id = 'd03edfd2-47ce-4fea-b573-abc22e9ddd83');

DELETE FROM places WHERE id = 'd03edfd2-47ce-4fea-b573-abc22e9ddd83';

SELECT COUNT(*) as remaining_bad_coords
FROM places
WHERE lat::float NOT BETWEEN 50 AND 62
   OR lng::float NOT BETWEEN 155 AND 170;
